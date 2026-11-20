using Lending.Domain.Enums;

namespace Lending.Domain.Engine.Schemes;

public sealed class NoInterestScheduleGenerator : ILoanScheduleGenerator
{
    public LoanSchedule GenerateSchedule(LoanParameters p)
    {
        p.Validate();

        var n = p.TotalInstallments;
        var principalPortion = LoanMathHelper.Round(p.Principal / n);
        var installments = new List<ScheduledInstallment>();
        var balance = p.Principal;
        decimal accumulatedPrincipal = decimal.Zero;

        for (int k = 1; k <= n; k++)
        {
            var dueDate = LoanMathHelper.CalculateDueDate(p.DisbursementDate, k, p.Frequency);
            decimal principal;

            if (k < n)
            {
                principal = principalPortion;
                accumulatedPrincipal += principal;
            }
            else
            {
                principal = p.Principal - accumulatedPrincipal;
            }

            balance -= principal;
            installments.Add(new ScheduledInstallment(
                Number: k,
                DueDate: dueDate,
                Principal: principal,
                Interest: decimal.Zero,
                Total: principal,
                BalanceAfter: balance));
        }

        return new LoanSchedule(
            Installments: installments,
            TotalPrincipal: p.Principal,
            TotalInterest: decimal.Zero,
            TotalToPay: p.Principal,
            AnnualEffectiveRate: decimal.Zero);
    }
}
