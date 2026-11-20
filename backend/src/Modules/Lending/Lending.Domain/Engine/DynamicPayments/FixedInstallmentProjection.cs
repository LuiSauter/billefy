using Lending.Domain.Enums;

namespace Lending.Domain.Engine.DynamicPayments;

/// <summary>Reprojects only unearned future components; the first boundary's outstanding interest is known.</summary>
internal static class FixedInstallmentProjection
{
    public static IReadOnlyList<DynamicLoanInstallmentBalance> Reduce(
        IReadOnlyList<DynamicLoanInstallmentBalance> balances, DynamicLoanPaymentInput input,
        decimal earlyPrincipal, DateOnly effectiveDate, IReadOnlySet<Guid> settledInstallments)
    {
        var rows = balances.OrderBy(row => row.DueDate).ThenBy(row => row.Number).ToList();
        var eligible = rows.Select((row, index) => (row, index))
            .Where(x => x.row.DueDate >= effectiveDate && !settledInstallments.Contains(x.row.InstallmentId)).ToList();
        var balance = eligible.Sum(x => x.row.OutstandingPrincipal) - earlyPrincipal;
        if (balance < 0m)
            throw new ArgumentException("Early principal exceeds remaining future principal.", nameof(earlyPrincipal));
        if (eligible.Count == 0)
            throw new ArgumentException("Early principal requires an original future boundary.", nameof(effectiveDate));

        var originals = input.OriginalInstallments.OrderBy(i => i.DueDate).ThenBy(i => i.Number).ToList();
        var periodRates = new Dictionary<Guid, decimal>();
        var periodStart = input.DisbursementDate!.Value;
        foreach (var original in originals)
        {
            periodRates[original.Id] = LoanMathHelper.CalculatePeriodicRate(input.StatedRate!.Value,
                input.RateUnit, input.DayCount, input.Frequency!.Value, periodStart, original.DueDate);
            periodStart = original.DueDate;
        }
        var rates = eligible.Select(x => periodRates[x.row.InstallmentId]).ToList();
        decimal? knownInterest = eligible[0].row.DueDate == effectiveDate
            ? eligible[0].row.OutstandingRegularInterest
            : null;
        var preservePayment = input.EarlyPaymentPolicy == EarlyPaymentPolicy.ReduceTerm;
        var payment = preservePayment
            ? originals[0].ExpectedPrincipal + originals[0].ExpectedInterest
            : SolveLevelPayment(balance, rates, knownInterest);

        for (var position = 0; position < eligible.Count; position++)
        {
            var (row, index) = eligible[position];
            var interest = position == 0 && knownInterest.HasValue
                ? knownInterest.Value
                : LoanMathHelper.Round(balance * rates[position]);
            var principal = position == eligible.Count - 1
                ? balance
                : Math.Min(balance, Math.Max(0m, payment - interest));
            rows[index] = row with
            {
                OutstandingPrincipal = principal,
                OutstandingRegularInterest = interest,
                TotalOutstanding = principal + interest + row.OutstandingLateInterest
            };
            balance -= principal;
            if (!preservePayment && position == 0 && knownInterest.HasValue && payment <= interest)
            {
                // An exceptional first amount pays earned interest only, never capitalizing it.
                // Later dates use an ordinary annuity, not the known-zero-interest recurrence.
                payment = SolveLevelPayment(balance, rates.Skip(1).ToList(), null);
            }
        }
        return rows;
    }

    private static decimal SolveLevelPayment(decimal principal, IReadOnlyList<decimal> rates, decimal? knownFirstInterest)
    {
        if (rates.Count == 0) return 0m;
        decimal discount = 1m;
        decimal factor = knownFirstInterest.HasValue ? 1m : 0m;
        // A known first interest (including zero) means the first payment is undiscounted.
        // An ordinary annuity instead discounts every payment and uses principal alone.
        foreach (var rate in knownFirstInterest.HasValue ? rates.Skip(1) : rates)
        {
            discount /= 1m + rate;
            factor += discount;
        }
        return LoanMathHelper.Round((principal + (knownFirstInterest ?? 0m)) / factor);
    }
}
