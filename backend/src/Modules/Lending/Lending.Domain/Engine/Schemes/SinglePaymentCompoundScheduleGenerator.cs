using Lending.Domain.Enums;

namespace Lending.Domain.Engine.Schemes;

public sealed class SinglePaymentCompoundScheduleGenerator : ILoanScheduleGenerator
{
    public LoanSchedule GenerateSchedule(LoanParameters p)
    {
        p.Validate();

        var m = p.CompoundingPeriods > 0 ? p.CompoundingPeriods : 1;
        var compoundingFreq = p.Compounding ?? PaymentFrequency.Monthly;
        var firstDueDate = LoanMathHelper.CalculateDueDate(p.DisbursementDate, 1, compoundingFreq);
        var ic = LoanMathHelper.CalculatePeriodicRate(
            p.Rate, p.RateUnit, DayCount.Thirty360, compoundingFreq, p.DisbursementDate, firstDueDate);

        var factor = Math.Pow(1.0 + (double)ic, m);
        var total = LoanMathHelper.Round(p.Principal * (decimal)factor);
        var interest = total - p.Principal;

        var maturityDate = p.MaturityDate ?? p.DisbursementDate.AddMonths(m);
        var days = maturityDate.DayNumber - p.DisbursementDate.DayNumber;

        var installment = new ScheduledInstallment(
            Number: 1,
            DueDate: maturityDate,
            Principal: p.Principal,
            Interest: interest,
            Total: total,
            BalanceAfter: decimal.Zero);

        var tea = AprCalculator.CalculateSinglePaymentTea(p.Principal, total, days);

        return new LoanSchedule(
            Installments: [installment],
            TotalPrincipal: p.Principal,
            TotalInterest: interest,
            TotalToPay: total,
            AnnualEffectiveRate: tea);
    }
}
