using Lending.Domain.Enums;

namespace Lending.Domain.Engine.Schemes;

public sealed class FixedInstallmentScheduleGenerator : ILoanScheduleGenerator
{
    public LoanSchedule GenerateSchedule(LoanParameters p)
    {
        p.Validate();

        var n = p.TotalInstallments;
        var firstDueDate = LoanMathHelper.CalculateDueDate(p.DisbursementDate, 1, p.Frequency);
        var i = LoanMathHelper.CalculatePeriodicRate(
            p.Rate, p.RateUnit, p.DayCount, p.Frequency, p.DisbursementDate, firstDueDate);

        decimal regularInstallmentTotal;

        if (i > decimal.Zero)
        {
            var pDbl = (double)p.Principal;
            var iDbl = (double)i;
            var unroundedA = (pDbl * iDbl) / (1.0 - Math.Pow(1.0 + iDbl, -n));
            regularInstallmentTotal = LoanMathHelper.Round((decimal)unroundedA);
        }
        else
        {
            regularInstallmentTotal = LoanMathHelper.Round(p.Principal / n);
        }

        var installments = new List<ScheduledInstallment>();
        var balance = p.Principal;
        decimal totalInterest = decimal.Zero;
        decimal totalPrincipal = decimal.Zero;

        for (int k = 1; k <= n; k++)
        {
            var dueDate = LoanMathHelper.CalculateDueDate(p.DisbursementDate, k, p.Frequency);
            var interest = LoanMathHelper.Round(balance * i);
            decimal principal;
            decimal total;

            if (k < n)
            {
                total = regularInstallmentTotal;
                principal = total - interest;
            }
            else
            {
                // Last installment absorbs remaining balance
                principal = balance;
                total = principal + interest;
            }

            totalInterest += interest;
            totalPrincipal += principal;
            balance -= principal;

            installments.Add(new ScheduledInstallment(
                Number: k,
                DueDate: dueDate,
                Principal: principal,
                Interest: interest,
                Total: total,
                BalanceAfter: balance));
        }

        var tea = i > decimal.Zero
            ? AprCalculator.CalculateNominalCompoundedTea(i, p.Frequency)
            : decimal.Zero;

        return new LoanSchedule(
            Installments: installments,
            TotalPrincipal: totalPrincipal,
            TotalInterest: totalInterest,
            TotalToPay: totalPrincipal + totalInterest,
            AnnualEffectiveRate: tea);
    }
}
