namespace Lending.Contracts;

public sealed record SimulateLoanRequest(
    decimal Principal,
    decimal Rate,
    string RateUnit = "Monthly",
    string DayCount = "Thirty360",
    string Frequency = "Monthly",
    string Template = "FixedInstallment",
    int TotalInstallments = 12,
    DateOnly? DisbursementDate = null,
    int GraceDays = 0,
    decimal? LateRate = null,
    string? Compounding = null,
    int CompoundingPeriods = 1,
    DateOnly? MaturityDate = null,
    string? EarlyPaymentPolicy = null,
    string? AllocationOrder = null);

public sealed record InstallmentScheduleDto(
    int Number,
    DateOnly DueDate,
    decimal Principal,
    decimal Interest,
    decimal Total,
    decimal BalanceAfter);

public sealed record LoanScheduleDto(
    List<InstallmentScheduleDto> Installments,
    decimal TotalPrincipal,
    decimal TotalInterest,
    decimal TotalToPay,
    decimal AnnualEffectiveRate);

public sealed record CreateLoanRequest(
    string CounterpartyName,
    string Type,
    string Template,
    decimal Principal,
    string Currency,
    decimal InterestRate,
    string RateUnit = "Monthly",
    string DayCount = "Thirty360",
    string Frequency = "Monthly",
    int TotalInstallments = 12,
    DateOnly? DisbursementDate = null,
    Guid? CounterpartyId = null,
    Guid? DisbursementAccountId = null,
    string? CounterpartyNotes = null,
    int GraceDays = 0,
    decimal? LateRate = null,
    string? Compounding = null,
    int CompoundingPeriods = 1,
    DateOnly? MaturityDate = null,
    string? EarlyPaymentPolicy = null,
    string? AllocationOrder = null,
    string OriginationKind = "CashDisbursement",
    string LoanKind = "Loan",
    Guid? IdempotencyKey = null);

public sealed record LoanCancellationEligibilityDto(bool CanCancel, string? ReasonCode);

public sealed record LoanCancellationResultDto(string Status, Guid? ReversalTransactionId);

public sealed record LoanSummaryDto(
    Guid Id,
    Guid CounterpartyId,
    string CounterpartyName,
    string Type,
    string Template,
    string Status,
    decimal Principal,
    string Currency,
    decimal InterestRate,
    decimal AnnualEffectiveRate,
    decimal RemainingPrincipal,
    DateOnly DisbursementDate,
    DateOnly FirstDueDate,
    int TotalInstallments,
    DateTime CreatedAt,
    LoanCancellationEligibilityDto CancellationEligibility,
    string EarlyPaymentPolicy = "AdvanceInstallments",
    decimal? LateRate = null,
    int GraceDays = 0,
    string? AllocationOrder = null,
    decimal TotalPayoff = 0m,
    decimal? SuggestedAmount = null,
    string? OriginationKind = null,
    string? LoanKind = null);

public sealed record LoanInstallmentDto(
    Guid Id,
    int Number,
    DateOnly DueDate,
    decimal ExpectedPrincipal,
    decimal ExpectedInterest,
    decimal ExpectedTotal,
    decimal PaidPrincipal,
    decimal PaidInterest,
    decimal PaidLateInterest,
    decimal RemainingPrincipal,
    string Status,
    decimal? OutstandingPrincipal = null,
    decimal? OutstandingInterest = null,
    decimal? OutstandingLateInterest = null,
    decimal? TotalOutstanding = null);

public sealed record PaymentAllocationDto(
    Guid InstallmentId,
    int InstallmentNumber,
    decimal ToLateInterest,
    decimal ToInterest,
    decimal ToPrincipal,
    decimal RemainingBalanceAfter);

public sealed record LoanPaymentDto(
    Guid Id,
    decimal Amount,
    string Currency,
    DateTime PaymentDate,
    string? Note,
    List<PaymentAllocationDto> Allocations,
    long? RecordSequence = null,
    int? CalculationVersion = null,
    decimal? EarlyPrincipalAmount = null,
    DateOnly? EarlyPrincipalEffectiveDate = null,
    decimal? RemainingBalanceAfter = null,
    bool IsAmbiguous = false);

public sealed record LoanInstallmentBalanceDto(
    Guid InstallmentId,
    int Number,
    DateOnly DueDate,
    decimal OutstandingPrincipal,
    decimal OutstandingRegularInterest,
    decimal OutstandingLateInterest,
    decimal TotalOutstanding);

public sealed record LoanHistoricalSnapshotDto(
    DateOnly PaymentDate,
    DateTime CreatedAt,
    long? RecordSequence,
    decimal? RemainingTotal,
    bool IsAmbiguous,
    Guid? PaymentId);

public sealed record LoanPaymentQuoteDto(
    Guid LoanId,
    string Currency,
    DateOnly AsOfDate,
    decimal TotalPayoff,
    decimal? SuggestedAmount,
    decimal RemainingPrincipal,
    string LoanStatus,
    string EarlyPaymentPolicy,
    List<LoanInstallmentBalanceDto> Installments,
    List<LoanInstallmentBalanceDto> ProjectedInstallments,
    List<PaymentAllocationDto> ProposedAllocations,
    decimal ProposedEarlyPrincipalAmount,
    DateOnly? ProposedEarlyPrincipalEffectiveDate,
    decimal ResultingPrincipal,
    string ResultingState,
    List<LoanHistoricalSnapshotDto> HistoricalSnapshots);

public sealed record LoanDetailDto(
    LoanSummaryDto Summary,
    List<LoanInstallmentDto> Installments,
    List<LoanPaymentDto> Payments,
    List<CardPurchaseDto>? Purchases = null);

public sealed record RegisterLoanPaymentRequest(
    decimal Amount,
    DateTime? PaymentDate = null,
    Guid? AccountId = null,
    string? Note = null,
    Guid? InterestCategoryId = null,
    Guid? IdempotencyKey = null);

public sealed record RegisterCardPurchaseRequest(decimal Amount, string Currency, Guid? CategoryId,
    DateTime OccurredAt, string? Description = null, Guid? IdempotencyKey = null);
public sealed record CardPurchaseDto(Guid Id, decimal Amount, string Currency, Guid? CategoryId,
    DateTime OccurredAt, string? Description, Guid LedgerTransactionId);

public sealed record LoanPaymentResultDto(
    Guid PaymentId,
    decimal AmountPaid,
    decimal RemainingPrincipal,
    string LoanStatus,
    List<PaymentAllocationDto> Allocations);
