using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Ledger.Contracts;
using Lending.Application.Abstractions;
using Lending.Contracts;
using Lending.Domain.Entities;
using Lending.Domain.Engine.DynamicPayments;
using Lending.Domain.Enums;
using System.Diagnostics;

namespace Lending.Application.Services;

public sealed class LoanService(
    ILoanRepository loanRepository,
    ICounterpartyRepository counterpartyRepository,
    ILedgerModule ledgerModule,
    ILendingUnitOfWork unitOfWork,
    ILoanTransaction loanTransaction,
    ICurrentUserContext userContext,
    IClock clock) : ILoanService
{
    public async Task<Result<Guid>> CreateLoanAsync(CreateLoanRequest request, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<Guid>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var userId = userContext.UserId!.Value;

        if (request.Principal <= decimal.Zero)
        {
            return Result.Failure<Guid>(Error.Validation("Loan.InvalidPrincipal", "Principal amount must be positive."));
        }

        if (string.IsNullOrWhiteSpace(request.CounterpartyName) && !request.CounterpartyId.HasValue)
        {
            return Result.Failure<Guid>(Error.Validation("Loan.InvalidCounterparty", "Counterparty name or ID is required."));
        }

        if (!Enum.TryParse<LoanTemplate>(request.Template, ignoreCase: true, out var template) || !Enum.IsDefined(template))
            return Result.Failure<Guid>(Error.Validation("Loan.InvalidTemplate", $"Unknown template '{request.Template}'."));
        if (!Enum.TryParse<EarlyPaymentPolicy>(request.EarlyPaymentPolicy ?? nameof(EarlyPaymentPolicy.AdvanceInstallments), ignoreCase: true, out var earlyPolicy)
            || !Enum.IsDefined(earlyPolicy))
            return Result.Failure<Guid>(Error.Validation("Loan.InvalidEarlyPaymentPolicy", $"Unknown early payment policy '{request.EarlyPaymentPolicy}'."));
        if (!Enum.TryParse<PaymentAllocationOrder>(request.AllocationOrder ?? nameof(PaymentAllocationOrder.LateInterestInterestPrincipal), ignoreCase: true, out var allocOrder)
            || !Enum.IsDefined(allocOrder))
            return Result.Failure<Guid>(Error.Validation("Loan.InvalidAllocationOrder", $"Unknown allocation order '{request.AllocationOrder}'."));
        if (!DynamicLoanPaymentCalculator.IsCompatible(template, earlyPolicy))
            return Result.Failure<Guid>(Error.Validation("Loan.IncompatiblePolicy", $"Policy '{earlyPolicy}' is incompatible with template '{template}'."));

        if (request.DisbursementAccountId.HasValue)
        {
            var userAccounts = await ledgerModule.GetAccountsByUserIdAsync(userId, cancellationToken);
            var disbursementAccount = userAccounts.FirstOrDefault(a => a.Id == request.DisbursementAccountId.Value);
            if (disbursementAccount is null)
            {
                return Result.Failure<Guid>(Error.NotFound("Account.NotFound", "Disbursement account was not found."));
            }

            if (!StringComparer.Ordinal.Equals(disbursementAccount.Currency, request.Currency))
            {
                return Result.Failure<Guid>(Error.Validation("Account.CurrencyMismatch", "Disbursement account currency must match the loan currency."));
            }
        }

        Guid? createdLoanId = null;
        var counterpartyNotFound = false;
        try
        {
            await loanTransaction.ExecuteAsync(async transactionToken =>
            {
                // Resolve or create the counterparty inside the same transaction as the loan and disbursement.
                Guid counterpartyId;
                if (request.CounterpartyId.HasValue)
                {
                    var existingCp = await counterpartyRepository.GetByIdAsync(request.CounterpartyId.Value, transactionToken);
                    if (existingCp is null || existingCp.UserId != userId)
                    {
                        counterpartyNotFound = true;
                        return;
                    }
                    counterpartyId = existingCp.Id;
                }
                else
                {
                    var newCp = Counterparty.Create(userId, request.CounterpartyName, request.CounterpartyNotes, clock.UtcNow);
                    await counterpartyRepository.AddAsync(newCp, transactionToken);
                    counterpartyId = newCp.Id;
                }

                Enum.TryParse<LoanType>(request.Type, ignoreCase: true, out var loanType);
                Enum.TryParse<RateUnit>(request.RateUnit, ignoreCase: true, out var rateUnit);
                Enum.TryParse<DayCount>(request.DayCount, ignoreCase: true, out var dayCount);
                Enum.TryParse<PaymentFrequency>(request.Frequency, ignoreCase: true, out var frequency);

                PaymentFrequency? compounding = null;
                if (!string.IsNullOrWhiteSpace(request.Compounding) &&
                    Enum.TryParse<PaymentFrequency>(request.Compounding, ignoreCase: true, out var comp))
                {
                    compounding = comp;
                }

                var currency = Currency.FromCode(request.Currency);
                var principalMoney = Money.Of(request.Principal, currency);
                var disbursementDate = request.DisbursementDate ?? clock.TodayUtc;
                var loan = Loan.Create(
                    userId,
                    counterpartyId,
                    request.DisbursementAccountId,
                    loanType,
                    template,
                    principalMoney,
                    request.InterestRate,
                    rateUnit,
                    dayCount,
                    frequency,
                    request.TotalInstallments,
                    disbursementDate,
                    request.GraceDays,
                    request.LateRate,
                    compounding,
                    request.CompoundingPeriods,
                    request.MaturityDate,
                    allocationOrder: allocOrder,
                    earlyPaymentPolicy: earlyPolicy,
                    activateImmediately: true,
                    createdAt: clock.UtcNow);

                if (request.DisbursementAccountId.HasValue)
                {
                    var ledgerDirection = loanType == LoanType.Lent ? "Expense" : "Income";
                    var desc = loanType == LoanType.Lent
                        ? $"Loan disbursement to {request.CounterpartyName}"
                        : $"Loan disbursement from {request.CounterpartyName}";
                    Guid transactionId;
                    try
                    {
                        transactionId = await ledgerModule.CreateTransactionFromDraftAsync(new CreateTransactionFromDraftDto(
                            userId,
                            request.DisbursementAccountId.Value,
                            request.Principal,
                            currency.Code,
                            ledgerDirection,
                            CategoryId: null,
                            disbursementDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
                            desc,
                            loan.Id,
                            Reference: $"LOAN-{loan.Id.ToString()[..8].ToUpperInvariant()}"),
                            transactionToken);
                    }
                    catch (InvalidOperationException)
                    {
                        throw new InvalidLoanDisbursementException();
                    }
                    loan.LinkDisbursementTransaction(transactionId);
                }

                await loanRepository.AddAsync(loan, transactionToken);
                await unitOfWork.SaveChangesAsync(transactionToken);
                createdLoanId = loan.Id;
            }, cancellationToken);
        }
        catch (InvalidLoanDisbursementException)
        {
            return Result.Failure<Guid>(Error.NotFound("Account.NotFound", "Disbursement account was not found."));
        }

        if (counterpartyNotFound)
            return Result.Failure<Guid>(Error.NotFound("Counterparty.NotFound", "Counterparty not found."));

        return createdLoanId.HasValue
            ? Result.Success(createdLoanId.Value)
            : Result.Failure<Guid>(Error.Failure("Loan.CreationFailed", "Loan could not be created."));
    }

    private static DateTime NormalizePaymentDate(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };

    private sealed class InvalidLoanDisbursementException : Exception { }

    public async Task<Result<List<LoanSummaryDto>>> GetLoansAsync(string? type = null, string? status = null, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<List<LoanSummaryDto>>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        LoanType? loanType = null;
        if (!string.IsNullOrWhiteSpace(type) && Enum.TryParse<LoanType>(type, ignoreCase: true, out var parsedType))
        {
            loanType = parsedType;
        }

        LoanStatus? loanStatus = null;
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<LoanStatus>(status, ignoreCase: true, out var parsedStatus))
        {
            loanStatus = parsedStatus;
        }

        var loans = await loanRepository.GetByUserIdAsync(userContext.UserId!.Value, loanType, loanStatus, cancellationToken);
        var counterparties = await counterpartyRepository.GetByUserIdAsync(userContext.UserId!.Value, cancellationToken);
        var cpMap = counterparties.ToDictionary(c => c.Id, c => c.Name);

        var dtos = new List<LoanSummaryDto>(loans.Count);
        foreach (var loan in loans)
        {
            dtos.Add(new LoanSummaryDto(
                loan.Id,
                loan.CounterpartyId,
                cpMap.GetValueOrDefault(loan.CounterpartyId, "Desconocido"),
                loan.Type.ToString(),
                loan.Template.ToString(),
                loan.Status.ToString(),
                loan.Principal.Amount,
                loan.Principal.Currency.Code,
                loan.InterestRate,
                loan.AnnualEffectiveRate,
                loan.RemainingPrincipal,
                loan.DisbursementDate,
                loan.FirstDueDate,
                loan.TotalInstallments,
                loan.CreatedAt,
                await GetCancellationEligibilityAsync(loan, cancellationToken),
                loan.EarlyPaymentPolicy.ToString(),
                loan.LateRate,
                loan.GraceDays,
                loan.AllocationOrder.ToString()));
        }

        return Result.Success(dtos);
    }

    public async Task<Result<LoanDetailDto>> GetLoanByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<LoanDetailDto>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var loan = await loanRepository.GetByIdAsync(id, cancellationToken);
        if (loan is null || loan.UserId != userContext.UserId!.Value)
        {
            return Result.Failure<LoanDetailDto>(Error.NotFound("Loan.NotFound", "Loan not found."));
        }

        var cp = await counterpartyRepository.GetByIdAsync(loan.CounterpartyId, cancellationToken);
        var lastPaymentDate = LastPaymentDate(loan);
        var asOfDate = clock.TodayUtc > lastPaymentDate ? clock.TodayUtc : lastPaymentDate;
        var calculation = LoanPaymentCalculationAdapter.Calculate(loan, asOfDate);
        var balances = calculation.Installments.ToDictionary(i => i.InstallmentId);
        var snapshots = calculation.HistoricalSnapshots.ToDictionary(s => s.PaymentId!.Value);

        var summary = new LoanSummaryDto(
            loan.Id,
            loan.CounterpartyId,
            cp?.Name ?? "Desconocido",
            loan.Type.ToString(),
            loan.Template.ToString(),
            loan.Status is LoanStatus.Active or LoanStatus.InArrears ? calculation.ResultingState.ToString() : loan.Status.ToString(),
            loan.Principal.Amount,
            loan.Principal.Currency.Code,
            loan.InterestRate,
            loan.AnnualEffectiveRate,
            calculation.ResultingPrincipal,
            loan.DisbursementDate,
            loan.FirstDueDate,
            loan.TotalInstallments,
            loan.CreatedAt,
            await GetCancellationEligibilityAsync(loan, cancellationToken),
            loan.EarlyPaymentPolicy.ToString(),
            loan.LateRate,
            loan.GraceDays,
            loan.AllocationOrder.ToString(),
            calculation.TotalPayoff,
            calculation.SuggestedAmount);

        var installmentDtos = loan.Installments.OrderBy(i => i.Number).Select(i => new LoanInstallmentDto(
            i.Id,
            i.Number,
            i.DueDate,
            i.ExpectedPrincipal,
            i.ExpectedInterest,
            i.ExpectedTotal,
            i.PaidPrincipal,
            i.PaidInterest,
            i.PaidLateInterest,
            i.RemainingPrincipal,
            i.Status.ToString(),
            balances[i.Id].OutstandingPrincipal,
            balances[i.Id].OutstandingRegularInterest,
            balances[i.Id].OutstandingLateInterest,
            balances[i.Id].TotalOutstanding)).ToList();

        var paymentDtos = loan.Payments.OrderByDescending(p => p.PaymentDate)
            .ThenByDescending(p => p.RecordSequence).ThenByDescending(p => p.CreatedAt).Select(p => new LoanPaymentDto(
            p.Id,
            p.Amount.Amount,
            p.Amount.Currency.Code,
            p.PaymentDate,
            p.Note,
            p.Allocations.Select(a =>
            {
                var inst = loan.Installments.FirstOrDefault(i => i.Id == a.InstallmentId);
                return new PaymentAllocationDto(
                    a.InstallmentId,
                    inst?.Number ?? 0,
                    a.ToLateInterest,
                    a.ToInterest,
                    a.ToPrincipal,
                    inst?.RemainingPrincipal ?? 0m);
            }).ToList(),
            p.RecordSequence,
            p.CalculationVersion,
            p.EarlyPrincipalAmount,
            p.EarlyPrincipalEffectiveDate,
            snapshots[p.Id].RemainingTotal,
            snapshots[p.Id].IsAmbiguous)).ToList();

        return Result.Success(new LoanDetailDto(summary, installmentDtos, paymentDtos));
    }

    private static DateOnly LastPaymentDate(Loan loan) => loan.Payments
        .Select(p => DateOnly.FromDateTime(p.PaymentDate)).DefaultIfEmpty(DateOnly.MinValue).Max();

    public async Task<Result<LoanPaymentQuoteDto>> GetPaymentQuoteAsync(
        Guid loanId,
        DateOnly? paymentDate = null,
        decimal? amount = null,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
            return Result.Failure<LoanPaymentQuoteDto>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var loan = await loanRepository.GetByIdAsync(loanId, cancellationToken);
        if (loan is null || loan.UserId != userContext.UserId!.Value)
            return Result.Failure<LoanPaymentQuoteDto>(Error.NotFound("Loan.NotFound", "Loan not found."));
        if (loan.Status is not (LoanStatus.Active or LoanStatus.InArrears))
            return Result.Failure<LoanPaymentQuoteDto>(Error.Validation("Payment.InvalidOperation", $"Cannot apply payment to a loan with status '{loan.Status}'."));
        if (paymentDate.HasValue && paymentDate.Value < LastPaymentDate(loan))
            return Result.Failure<LoanPaymentQuoteDto>(Error.Validation("Payment.InvalidDate", "Payment date cannot precede the last recorded payment."));
        if (amount is <= 0m)
            return Result.Failure<LoanPaymentQuoteDto>(Error.Validation("Payment.InvalidAmount", "Payment amount must be positive."));
        if (amount.HasValue && (amount.Value > 99_999_999_999_999.999999m || amount.Value != decimal.Round(amount.Value, 6)))
            return Result.Failure<LoanPaymentQuoteDto>(Error.Validation("Payment.InvalidPrecision", "Payment amount exceeds supported precision."));

        var asOfDate = paymentDate ?? clock.TodayUtc;
        try
        {
            var calculation = LoanPaymentCalculationAdapter.Calculate(loan, asOfDate, amount);
            return Result.Success(new LoanPaymentQuoteDto(
                loan.Id,
                loan.Principal.Currency.Code,
                asOfDate,
                calculation.TotalPayoff,
                calculation.SuggestedAmount,
                calculation.Installments.Sum(i => i.OutstandingPrincipal),
                loan.Status.ToString(),
                loan.EarlyPaymentPolicy.ToString(),
                calculation.Installments.Select(ToBalanceDto).ToList(),
                calculation.ProjectedInstallments.Select(ToBalanceDto).ToList(),
                calculation.ProposedAllocations.Select(a => new PaymentAllocationDto(
                    a.InstallmentId, a.InstallmentNumber, a.ToLateInterest, a.ToInterest, a.ToPrincipal, a.RemainingBalanceAfter)).ToList(),
                calculation.ProposedEarlyPrincipalAmount,
                calculation.ProposedEarlyPrincipalEffectiveDate,
                calculation.ResultingPrincipal,
                calculation.ResultingState.ToString(),
                calculation.HistoricalSnapshots.Select(s => new LoanHistoricalSnapshotDto(
                    s.PaymentDate, s.CreatedAt, s.RecordSequence, s.RemainingTotal, s.IsAmbiguous, s.PaymentId)).ToList()));
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure<LoanPaymentQuoteDto>(Error.Validation("Payment.InvalidOperation", ex.Message));
        }
    }

    private static LoanInstallmentBalanceDto ToBalanceDto(DynamicLoanInstallmentBalance balance) => new(
        balance.InstallmentId, balance.Number, balance.DueDate, balance.OutstandingPrincipal,
        balance.OutstandingRegularInterest, balance.OutstandingLateInterest, balance.TotalOutstanding);

    public async Task<Result<LoanCancellationResultDto>> CancelLoanAsync(Guid id, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
            return Result.Failure<LoanCancellationResultDto>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var userId = userContext.UserId!.Value;
        Result<LoanCancellationResultDto>? operationResult = null;
        try
        {
            await loanTransaction.ExecuteAsync(async token =>
            {
                var loan = await loanRepository.GetByIdForUpdateAsync(id, userId, token);
                if (loan is null)
                {
                    operationResult = Result.Failure<LoanCancellationResultDto>(Error.NotFound("Loan.NotFound", "Loan not found."));
                    return;
                }

                if (loan.Status == LoanStatus.Cancelled)
                {
                    operationResult = Result.Success(new LoanCancellationResultDto(loan.Status.ToString(), loan.DisbursementReversalTransactionId));
                    return;
                }

                if (loan.Payments.Count != 0)
                {
                    operationResult = Result.Failure<LoanCancellationResultDto>(Error.Conflict("Loan.HasPayments", "A loan with recorded payments cannot be cancelled."));
                    return;
                }
                if (loan.Status != LoanStatus.Active)
                {
                    operationResult = Result.Failure<LoanCancellationResultDto>(Error.Conflict("Loan.InvalidStatus", "Only active loans can be cancelled."));
                    return;
                }
                if (loan.DisbursementAccountId.HasValue && !loan.DisbursementTransactionId.HasValue)
                {
                    operationResult = Result.Failure<LoanCancellationResultDto>(Error.Conflict("Loan.LegacyDisbursementUnlinked", "This loan has no authoritative disbursement link and cannot be safely cancelled."));
                    return;
                }
                if (!loan.DisbursementAccountId.HasValue && loan.DisbursementTransactionId.HasValue)
                {
                    operationResult = Result.Failure<LoanCancellationResultDto>(Error.Conflict("Loan.InvalidDisbursementLink", "The loan disbursement link is inconsistent."));
                    return;
                }

                Guid? reversalId = null;
                if (loan.DisbursementTransactionId.HasValue)
                {
                    var expectedDirection = loan.Type == LoanType.Lent ? "Expense" : "Income";
                    var reversalResult = await ledgerModule.ReverseLoanDisbursementAsync(new LoanDisbursementReversalRequestDto(
                        userId,
                        loan.DisbursementTransactionId.Value,
                        loan.DisbursementAccountId!.Value,
                        loan.Principal.Amount,
                        loan.Principal.Currency.Code,
                        expectedDirection), token);
                    if (reversalResult.ErrorCode is not null || !reversalResult.ReversalTransactionId.HasValue)
                    {
                        var error = reversalResult.ErrorCode == "Loan.DisbursementNotFound"
                            ? Error.NotFound("Loan.DisbursementNotFound", "Linked loan disbursement was not found.")
                            : Error.Conflict(reversalResult.ErrorCode ?? "Loan.DisbursementMismatch", "Linked loan disbursement cannot be safely reversed.");
                        operationResult = Result.Failure<LoanCancellationResultDto>(error);
                        return;
                    }
                    reversalId = reversalResult.ReversalTransactionId.Value;
                }

                loan.Cancel(clock.UtcNow, reversalId);
                await loanRepository.UpdateAsync(loan, token);
                await unitOfWork.SaveChangesAsync(token);
                operationResult = Result.Success(new LoanCancellationResultDto(loan.Status.ToString(), reversalId));
            }, cancellationToken);
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            return Result.Failure<LoanCancellationResultDto>(Error.Failure("Loan.CancellationFailed", "The loan cancellation could not be completed."));
        }

        return operationResult ?? Result.Failure<LoanCancellationResultDto>(Error.Failure("Loan.CancellationFailed", "The loan cancellation could not be completed."));
    }

    private async Task<LoanCancellationEligibilityDto> GetCancellationEligibilityAsync(Loan loan, CancellationToken cancellationToken)
    {
        if (loan.Payments.Count != 0)
            return new(false, "HasPayments");
        if (loan.Status != LoanStatus.Active)
            return new(false, "InvalidStatus");
        if (loan.DisbursementAccountId.HasValue && !loan.DisbursementTransactionId.HasValue)
            return new(false, "LegacyDisbursementUnlinked");
        if (!loan.DisbursementAccountId.HasValue && loan.DisbursementTransactionId.HasValue)
            return new(false, "InvalidDisbursementLink");
        if (!loan.DisbursementTransactionId.HasValue)
            return new(true, null);

        var validation = await ledgerModule.ValidateLoanDisbursementReversalAsync(new LoanDisbursementReversalRequestDto(
            loan.UserId,
            loan.DisbursementTransactionId.Value,
            loan.DisbursementAccountId!.Value,
            loan.Principal.Amount,
            loan.Principal.Currency.Code,
            loan.Type == LoanType.Lent ? "Expense" : "Income"), cancellationToken);
        return validation.ErrorCode is null
            ? new(true, null)
            : new(false, validation.ErrorCode.StartsWith("Loan.", StringComparison.Ordinal)
                ? validation.ErrorCode[5..]
                : validation.ErrorCode);
    }

    public async Task<Result<LoanPaymentResultDto>> RegisterPaymentAsync(
        Guid loanId,
        RegisterLoanPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
            return Result.Failure<LoanPaymentResultDto>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        if (request.Amount <= decimal.Zero)
            return Result.Failure<LoanPaymentResultDto>(Error.Validation("Payment.InvalidAmount", "Payment amount must be positive."));
        if (request.Amount > 99_999_999_999_999.999999m || request.Amount != decimal.Round(request.Amount, 6))
            return Result.Failure<LoanPaymentResultDto>(Error.Validation("Payment.InvalidPrecision", "Payment amount exceeds supported precision."));
        if (request.Note?.Trim().Length > 500)
            return Result.Failure<LoanPaymentResultDto>(Error.Validation("Payment.InvalidNote", "Payment note must be 500 characters or fewer."));

        var userId = userContext.UserId!.Value;
        var paymentDate = NormalizePaymentDate(request.PaymentDate ?? clock.UtcNow);
        LoanPaymentResultDto? paymentResult = null;
        Error? operationError = null;
        try
        {
            await loanTransaction.ExecuteAsync(async token =>
            {
                // Acquire the database row lock before reading status, payments, or balance state.
                var loan = await loanRepository.GetByIdForUpdateAsync(loanId, userId, token);
                if (loan is null)
                {
                    operationError = Error.NotFound("Loan.NotFound", "Loan not found.");
                    return;
                }
                if (loan.Status != LoanStatus.Active && loan.Status != LoanStatus.InArrears)
                {
                    operationError = Error.Validation("Payment.InvalidOperation", $"Cannot apply payment to a loan with status '{loan.Status}'.");
                    return;
                }

                Guid? ledgerTxnId = null;
                if (request.AccountId.HasValue)
                {
                    var ledgerDirection = loan.Type == LoanType.Lent ? "Income" : "Expense";
                    var description = loan.Type == LoanType.Lent
                        ? $"Loan repayment collected (Loan #{loan.Id.ToString()[..8]})"
                        : $"Loan payment made (Loan #{loan.Id.ToString()[..8]})";
                    var posting = await ledgerModule.RegisterLoanPaymentAsync(new LoanPaymentPostingRequestDto(
                        userId, request.AccountId.Value, request.Amount, loan.Principal.Currency.Code,
                        ledgerDirection, paymentDate, description, loan.Id,
                        Reference: $"PAY-{loan.Id.ToString()[..8]}"), token);
                    if (posting.ErrorCode is not null || !posting.TransactionId.HasValue)
                    {
                        operationError = posting.ErrorCode switch
                        {
                            "Account.NotFound" => Error.NotFound("Account.NotFound", "Payment account was not found."),
                            "Account.Archived" => Error.Validation("Account.Archived", "Archived accounts cannot receive payments."),
                            "Account.CurrencyMismatch" => Error.Validation("Account.CurrencyMismatch", "Payment account must use the loan currency."),
                            "Payment.InvalidNote" => Error.Validation("Payment.InvalidNote", "Payment note must be 500 characters or fewer."),
                            _ => Error.Validation(posting.ErrorCode ?? "Payment.InvalidAccount", "Payment account or amount is invalid.")
                        };
                        return;
                    }
                    ledgerTxnId = posting.TransactionId.Value;
                }

                var allocation = loan.RecordPayment(request.Amount, paymentDate, request.AccountId, ledgerTxnId, request.Note);
                await loanRepository.UpdateAsync(loan, token);
                var payment = loan.Payments.Last();
                await loanRepository.AddPaymentAsync(payment, token);
                await unitOfWork.SaveChangesAsync(token);
                var allocations = allocation.Allocations.Select(a => new PaymentAllocationDto(
                    a.InstallmentId, a.InstallmentNumber, a.ToLateInterest, a.ToInterest, a.ToPrincipal, a.RemainingBalanceAfter)).ToList();
                paymentResult = new LoanPaymentResultDto(payment.Id, request.Amount, loan.RemainingPrincipal, loan.Status.ToString(), allocations);
            }, cancellationToken);
        }
        catch (InvalidOperationException) when (!cancellationToken.IsCancellationRequested)
        {
            operationError = Error.Validation("Payment.InvalidOperation", "Payment cannot be applied to this loan or exceeds its outstanding scheduled balance.");
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            Trace.TraceError("LoanPaymentFailure ExceptionType={0} Category={1} TraceId={2}",
                ex.GetType().Name, "UnexpectedPaymentFailure", Activity.Current?.TraceId.ToString());
            operationError = Error.Failure("Payment.Failed", "An unexpected error occurred while processing the loan payment.");
        }

        return operationError is not null
            ? Result.Failure<LoanPaymentResultDto>(operationError)
            : paymentResult is not null
                ? Result.Success(paymentResult)
                : Result.Failure<LoanPaymentResultDto>(Error.Failure("Payment.Failed", "An unexpected error occurred while processing the loan payment."));
    }
}
