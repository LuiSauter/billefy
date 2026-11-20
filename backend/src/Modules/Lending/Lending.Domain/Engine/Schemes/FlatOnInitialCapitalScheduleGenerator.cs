using Lending.Domain.Enums;

namespace Lending.Domain.Engine.Schemes;

public sealed class FlatOnInitialCapitalScheduleGenerator : ILoanScheduleGenerator
{
    public LoanSchedule GenerateSchedule(LoanParameters p)
    {
        p.Validate();

        var n = p.TotalInstallments;
        var firstDueDate = LoanMathHelper.CalculateDueDate(p.DisbursementDate, 1, p.Frequency);
        var periodicRate = LoanMathHelper.CalculatePeriodicRate(
            p.Rate, p.RateUnit, p.DayCount, p.Frequency, p.DisbursementDate, firstDueDate);

        var interestPerPeriod = LoanMathHelper.Round(p.Principal * periodicRate);
        var regularPrincipal = LoanMathHelper.Round(p.Principal / n);

        var installments = new List<ScheduledInstallment>();
        var balance = p.Principal;
        decimal accumulatedPrincipal = decimal.Zero;
        decimal totalInterest = decimal.Zero;

        for (int k = 1; k <= n; k++)
        {
            var dueDate = LoanMathHelper.CalculateDueDate(p.DisbursementDate, k, p.Frequency);
            decimal principal;

            if (k < n)
            {
                principal = regularPrincipal;
                accumulatedPrincipal += principal;
            }
            else
            {
                principal = p.Principal - accumulatedPrincipal;
            }

            var interest = interestPerPeriod;
            totalInterest += interest;
            balance -= principal;

            installments.Add(new ScheduledInstallment(
                Number: k,
                DueDate: dueDate,
                Principal: principal,
                Interest: interest,
                Total: principal + interest,
                BalanceAfter: balance));
        }

        var totals = installments.Select(i => i.Total).ToList();
        var tea = AprCalculator.CalculateTea(p.Principal, totals, p.Frequency);

        return new LoanSchedule(
            Installments: installments,
            TotalPrincipal: p.Principal,
            TotalInterest: totalInterest,
            TotalToPay: p.Principal + totalInterest,
            AnnualEffectiveRate: tea);
    }
}
