using Lending.Domain.Entities;

namespace Lending.Domain.Engine.DynamicPayments;

/// <summary>Read-only replay adapter. Requires all original installments, payments, and recorded allocations.</summary>
public static class LoanPaymentCalculationAdapter
{
    public const int CurrentCalculationVersion = 1;

    public static DynamicLoanPaymentResult Calculate(Loan loan, DateOnly asOfDate, decimal? proposedAmount = null)
    {
        ArgumentNullException.ThrowIfNull(loan);
        foreach (var payment in loan.Payments)
        {
            var recordedAmount = payment.Allocations.Sum(a => a.ToLateInterest + a.ToInterest + a.ToPrincipal)
                + (payment.EarlyPrincipalAmount ?? 0m);
            if (recordedAmount != payment.Amount.Amount)
                throw new InvalidOperationException("Calculation requires complete recorded payment allocations and early principal.");
        }

        // Expected components are immutable original obligations; Paid* caches must never seed replay.
        var input = new DynamicLoanPaymentInput(
            loan.Installments.Select(i => new DynamicLoanInstallmentInput(i.Id, i.Number, i.DueDate,
                i.ExpectedPrincipal, i.ExpectedInterest)).ToList(),
            loan.Payments.Select(p => new DynamicLoanRecordedPayment(DateOnly.FromDateTime(p.PaymentDate), p.CreatedAt,
                p.Allocations.Select(a => new DynamicLoanRecordedAllocation(a.InstallmentId, a.ToLateInterest,
                    a.ToInterest, a.ToPrincipal)).ToList(), p.RecordSequence, p.CalculationVersion,
                p.EarlyPrincipalAmount, p.EarlyPrincipalEffectiveDate, p.Id)).ToList(),
            asOfDate, proposedAmount, loan.LateRate, loan.RateUnit, loan.DayCount, loan.GraceDays,
            loan.AllocationOrder, loan.EarlyPaymentPolicy, loan.Type, loan.Template,
            loan.InterestRate, loan.DisbursementDate, loan.Frequency);
        return DynamicLoanPaymentCalculator.Calculate(input);
    }
}
