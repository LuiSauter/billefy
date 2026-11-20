using Lending.Domain.Enums;

namespace Lending.Domain.Engine.Schemes;

public sealed class InterestOnlyScheduleGenerator : ILoanScheduleGenerator
{
    public LoanSchedule GenerateSchedule(LoanParameters p)
    {
        p.Validate();

        var n = p.TotalInstallments;
        var firstDueDate = LoanMathHelper.CalculateDueDate(p.DisbursementDate, 1, p.Frequency);
        var i = LoanMathHelper.CalculatePeriodicRate(
            p.Rate, p.RateUnit, p.DayCount, p.Frequency, p.DisbursementDate, firstDueDate);

        var installments = new List<ScheduledInstallment>();
        var balance = p.Principal;
        decimal totalInterest = decimal.Zero;

        for (int k = 1; k <= n; k++)
        {
            var dueDate = LoanMathHelper.CalculateDueDate(p.DisbursementDate, k, p.Frequency);
            var interest = LoanMathHelper.Round(p.Principal * i);
            totalInterest += interest;

            decimal principal = k < n ? decimal.Zero : p.Principal;
            var total = principal + interest;
            balance -= principal;

            installments.Add(new ScheduledInstallment(
                Number: k,
                DueDate: dueDate,
                Principal: principal,
                Interest: interest,
                Total: total,
                BalanceAfter: balance));
        }

        var totals = installments.Select(inst => inst.Total).ToList();
        var tea = AprCalculator.CalculateTea(p.Principal, totals, p.Frequency);

        return new LoanSchedule(
            Installments: installments,
            TotalPrincipal: p.Principal,
            TotalInterest: totalInterest,
            TotalToPay: p.Principal + totalInterest,
            AnnualEffectiveRate: tea);
    }
}
