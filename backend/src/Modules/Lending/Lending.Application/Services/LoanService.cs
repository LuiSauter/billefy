using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Ledger.Contracts;
using Lending.Application.Abstractions;
using Lending.Contracts;
using Lending.Domain.Entities;
using Lending.Domain.Enums;

namespace Lending.Application.Services;

public sealed class LoanService(
    ILoanRepository loanRepository,
    ICounterpartyRepository counterpartyRepository,
    ILedgerModule ledgerModule,
    ILendingUnitOfWork unitOfWork,
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

        // 1. Resolve or create counterparty
        Guid counterpartyId;
        if (request.CounterpartyId.HasValue)
        {
            var existingCp = await counterpartyRepository.GetByIdAsync(request.CounterpartyId.Value, cancellationToken);
            if (existingCp is null || existingCp.UserId != userId)
            {
                return Result.Failure<Guid>(Error.NotFound("Counterparty.NotFound", "Counterparty not found."));
            }
            counterpartyId = existingCp.Id;
        }
        else
        {
            var newCp = Counterparty.Create(userId, request.CounterpartyName, request.CounterpartyNotes, clock.UtcNow);
            await counterpartyRepository.AddAsync(newCp, cancellationToken);
            counterpartyId = newCp.Id;
        }

        // 2. Parse enums
        Enum.TryParse<LoanType>(request.Type, ignoreCase: true, out var loanType);
        Enum.TryParse<LoanTemplate>(request.Template, ignoreCase: true, out var template);
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

        // 3. Create Loan with calculated schedule
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
            activateImmediately: true,
            createdAt: clock.UtcNow);

        // 4. If disbursement account specified, record movement in Ledger (Section 5.4 Architecture)
        if (request.DisbursementAccountId.HasValue)
        {
            var ledgerDirection = loanType == LoanType.Lent ? "Expense" : "Income";
            var desc = loanType == LoanType.Lent
                ? $"Loan disbursement to {request.CounterpartyName}"
                : $"Loan disbursement from {request.CounterpartyName}";

            try
            {
                await ledgerModule.CreateTransactionFromDraftAsync(new CreateTransactionFromDraftDto(
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
                    cancellationToken);
            }
            catch (InvalidOperationException)
            {
                return Result.Failure<Guid>(Error.NotFound("Account.NotFound", "Disbursement account was not found."));
            }
        }

        await loanRepository.AddAsync(loan, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(loan.Id);
    }

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

        var dtos = loans.Select(l => new LoanSummaryDto(
            l.Id,
            l.CounterpartyId,
            cpMap.GetValueOrDefault(l.CounterpartyId, "Desconocido"),
            l.Type.ToString(),
            l.Template.ToString(),
            l.Status.ToString(),
            l.Principal.Amount,
            l.Principal.Currency.Code,
            l.InterestRate,
            l.AnnualEffectiveRate,
            l.RemainingPrincipal,
            l.DisbursementDate,
            l.FirstDueDate,
            l.TotalInstallments,
            l.CreatedAt)).ToList();

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

        var summary = new LoanSummaryDto(
            loan.Id,
            loan.CounterpartyId,
            cp?.Name ?? "Desconocido",
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
            loan.CreatedAt);

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
            i.Status.ToString())).ToList();

        var paymentDtos = loan.Payments.OrderByDescending(p => p.PaymentDate).Select(p => new LoanPaymentDto(
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
            }).ToList())).ToList();

        return Result.Success(new LoanDetailDto(summary, installmentDtos, paymentDtos));
    }

    public async Task<Result<LoanPaymentResultDto>> RegisterPaymentAsync(
        Guid loanId,
        RegisterLoanPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<LoanPaymentResultDto>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (request.Amount <= decimal.Zero)
        {
            return Result.Failure<LoanPaymentResultDto>(Error.Validation("Payment.InvalidAmount", "Payment amount must be positive."));
        }

        var loan = await loanRepository.GetByIdAsync(loanId, cancellationToken);
        if (loan is null || loan.UserId != userContext.UserId!.Value)
        {
            return Result.Failure<LoanPaymentResultDto>(Error.NotFound("Loan.NotFound", "Loan not found."));
        }

        var paymentDate = request.PaymentDate ?? clock.UtcNow;
        Guid? ledgerTxnId = null;

        // If an account is linked to the payment, reflect it in the Ledger
        if (request.AccountId.HasValue)
        {
            var ledgerDirection = loan.Type == LoanType.Lent ? "Income" : "Expense";
            var desc = loan.Type == LoanType.Lent
                ? $"Loan repayment collected (Loan #{loan.Id.ToString()[..8]})"
                : $"Loan payment made (Loan #{loan.Id.ToString()[..8]})";

            try
            {
                ledgerTxnId = await ledgerModule.CreateTransactionFromDraftAsync(new CreateTransactionFromDraftDto(
                    userContext.UserId!.Value,
                    request.AccountId.Value,
                    request.Amount,
                    loan.Principal.Currency.Code,
                    ledgerDirection,
                    CategoryId: null,
                    paymentDate,
                    desc,
                    loan.Id,
                    Reference: $"PAY-{loan.Id.ToString()[..8]}"),
                    cancellationToken);
            }
            catch (InvalidOperationException)
            {
                return Result.Failure<LoanPaymentResultDto>(Error.NotFound("Account.NotFound", "Payment account was not found."));
            }
        }

        try
        {
            var allocationResult = loan.RecordPayment(
                request.Amount,
                paymentDate,
                request.AccountId,
                ledgerTxnId,
                request.Note);

            await loanRepository.UpdateAsync(loan, cancellationToken);
            var payment = loan.Payments.Last();
            await loanRepository.AddPaymentAsync(payment, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            var allocDtos = allocationResult.Allocations.Select(a => new PaymentAllocationDto(
                a.InstallmentId,
                a.InstallmentNumber,
                a.ToLateInterest,
                a.ToInterest,
                a.ToPrincipal,
                a.RemainingBalanceAfter)).ToList();

            return Result.Success(new LoanPaymentResultDto(
                payment.Id,
                request.Amount,
                loan.RemainingPrincipal,
                loan.Status.ToString(),
                allocDtos));
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure<LoanPaymentResultDto>(Error.Validation("Payment.InvalidOperation", ex.Message));
        }
        catch (Exception)
        {
            return Result.Failure<LoanPaymentResultDto>(Error.Failure("Payment.Failed", "An unexpected error occurred while processing the loan payment."));
        }
    }
}
