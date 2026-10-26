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
    DateOnly? MaturityDate = null);

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
    DateOnly? MaturityDate = null);

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
    DateTime CreatedAt);

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
    string Status);

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
    List<PaymentAllocationDto> Allocations);

public sealed record LoanDetailDto(
    LoanSummaryDto Summary,
    List<LoanInstallmentDto> Installments,
    List<LoanPaymentDto> Payments);

public sealed record RegisterLoanPaymentRequest(
    decimal Amount,
    DateTime? PaymentDate = null,
    Guid? AccountId = null,
    string? Note = null);

public sealed record LoanPaymentResultDto(
    Guid PaymentId,
    decimal AmountPaid,
    decimal RemainingPrincipal,
    string LoanStatus,
    List<PaymentAllocationDto> Allocations);
