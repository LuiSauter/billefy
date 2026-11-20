using Lending.Domain.Enums;

namespace Lending.Domain.Engine;

public sealed record LoanParameters(
    decimal Principal,
    decimal Rate,
    RateUnit RateUnit,
    DayCount DayCount,
    PaymentFrequency Frequency,
    int TotalInstallments,
    DateOnly DisbursementDate,
    int GraceDays = 0,
    decimal? LateRate = null,
    PaymentFrequency? Compounding = null,
    int CompoundingPeriods = 1,
    DateOnly? MaturityDate = null,
    PaymentAllocationOrder AllocationOrder = PaymentAllocationOrder.LateInterestInterestPrincipal,
    EarlyPaymentPolicy EarlyPaymentPolicy = EarlyPaymentPolicy.AdvanceInstallments)
{
    public void Validate()
    {
        if (Principal <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(Principal), "Principal must be strictly positive.");

        if (Rate < decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(Rate), "Rate cannot be negative.");

        if (TotalInstallments < 1)
            throw new ArgumentOutOfRangeException(nameof(TotalInstallments), "Total installments must be at least 1.");

        if (GraceDays < 0)
            throw new ArgumentOutOfRangeException(nameof(GraceDays), "Grace days cannot be negative.");

        if (LateRate.HasValue && LateRate.Value < decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(LateRate), "Late rate cannot be negative.");
    }
}

public sealed record ScheduledInstallment(
    int Number,
    DateOnly DueDate,
    decimal Principal,
    decimal Interest,
    decimal Total,
    decimal BalanceAfter);

public sealed record LoanSchedule(
    IReadOnlyList<ScheduledInstallment> Installments,
    decimal TotalPrincipal,
    decimal TotalInterest,
    decimal TotalToPay,
    decimal AnnualEffectiveRate);
