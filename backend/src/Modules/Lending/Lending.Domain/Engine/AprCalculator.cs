using Lending.Domain.Enums;

namespace Lending.Domain.Engine;

public static class AprCalculator
{
    private const double Tolerance = 1e-12;
    private const int MaxIterations = 150;

    public static decimal CalculateTea(
        decimal principal,
        IReadOnlyList<decimal> installmentTotals,
        PaymentFrequency frequency)
    {
        if (principal <= decimal.Zero || installmentTotals.Count == 0)
        {
            return decimal.Zero;
        }

        var p = (double)principal;
        var totals = installmentTotals.Select(t => (double)t).ToArray();

        int periodsPerYear = frequency switch
        {
            PaymentFrequency.Monthly => 12,
            PaymentFrequency.Biweekly => 24,
            PaymentFrequency.Weekly => 52,
            _ => 12
        };

        // If total to pay <= principal, TEA = 0
        if (totals.Sum() <= p)
        {
            return decimal.Zero;
        }

        // Solve for y where sum(totals[k] / (1+y)^k) - p == 0
        // Use bisection bracket [0.0, 5.0]
        double low = 0.0;
        double high = 5.0;

        // Ensure high brackets the root
        while (NpV(totals, high) > p && high < 100.0)
        {
            high *= 2.0;
        }

        double y = (low + high) / 2.0;

        for (int iter = 0; iter < MaxIterations; iter++)
        {
            var npv = NpV(totals, y);
            var diff = npv - p;

            if (Math.Abs(diff) < Tolerance || (high - low) < Tolerance)
            {
                break;
            }

            if (diff > 0)
            {
                low = y;
            }
            else
            {
                high = y;
            }

            y = (low + high) / 2.0;
        }

        var tea = Math.Pow(1.0 + y, periodsPerYear) - 1.0;
        return Math.Round((decimal)tea, 6, MidpointRounding.AwayFromZero);
    }

    public static decimal CalculateNominalCompoundedTea(decimal periodicRate, PaymentFrequency frequency)
    {
        int periodsPerYear = frequency switch
        {
            PaymentFrequency.Monthly => 12,
            PaymentFrequency.Biweekly => 24,
            PaymentFrequency.Weekly => 52,
            _ => 12
        };

        var tea = Math.Pow(1.0 + (double)periodicRate, periodsPerYear) - 1.0;
        return Math.Round((decimal)tea, 6, MidpointRounding.AwayFromZero);
    }

    public static decimal CalculateSinglePaymentTea(decimal principal, decimal totalToPay, int days)
    {
        if (principal <= decimal.Zero || totalToPay <= decimal.Zero || days <= 0)
        {
            return decimal.Zero;
        }

        var p = (double)principal;
        var t = (double)totalToPay;
        var tea = Math.Pow(t / p, 365.0 / days) - 1.0;

        return Math.Round((decimal)tea, 6, MidpointRounding.AwayFromZero);
    }

    private static double NpV(double[] totals, double rate)
    {
        double sum = 0.0;
        double discount = 1.0;
        double factor = 1.0 + rate;

        for (int i = 0; i < totals.Length; i++)
        {
            discount *= factor;
            sum += totals[i] / discount;
        }

        return sum;
    }
}
