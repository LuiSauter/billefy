using Lending.Domain.Enums;

namespace Lending.Domain.Engine;

public static class LoanMathHelper
{
    public const int CurrencyScale = 2;

    public static decimal Round(decimal value) =>
        Math.Round(value, CurrencyScale, MidpointRounding.AwayFromZero);

    public static decimal CalculateDailyRate(decimal statedRate, RateUnit unit, DayCount dayCount)
    {
        if (statedRate <= decimal.Zero) return decimal.Zero;

        return (unit, dayCount) switch
        {
            (RateUnit.Monthly, DayCount.Thirty360) => statedRate / 30m,
            (RateUnit.Annual, DayCount.Thirty360) => statedRate / 360m,
            (RateUnit.Monthly, DayCount.Actual365) => (statedRate * 12m) / 365m,
            (RateUnit.Annual, DayCount.Actual365) => statedRate / 365m,
            _ => statedRate / 30m
        };
    }

    public static decimal CalculatePeriodicRate(
        decimal statedRate,
        RateUnit unit,
        DayCount dayCount,
        PaymentFrequency frequency,
        DateOnly periodStart,
        DateOnly periodEnd)
    {
        if (statedRate <= decimal.Zero) return decimal.Zero;

        if (dayCount == DayCount.Thirty360)
        {
            // Nominal periods: monthly=30, biweekly=15, weekly=7
            return frequency switch
            {
                PaymentFrequency.Monthly => unit == RateUnit.Monthly ? statedRate : statedRate / 12m,
                PaymentFrequency.Biweekly => unit == RateUnit.Monthly ? statedRate / 2m : statedRate / 24m,
                PaymentFrequency.Weekly => CalculateDailyRate(statedRate, unit, dayCount) * 7m,
                PaymentFrequency.Single => CalculateDailyRate(statedRate, unit, dayCount) * 30m,
                _ => statedRate
            };
        }

        // ACTUAL_365
        var actualDays = periodEnd.DayNumber - periodStart.DayNumber;
        var dailyRate = CalculateDailyRate(statedRate, unit, dayCount);
        return dailyRate * actualDays;
    }

    public static DateOnly CalculateDueDate(DateOnly start, int installmentNumber, PaymentFrequency frequency)
    {
        return frequency switch
        {
            PaymentFrequency.Monthly => start.AddMonths(installmentNumber),
            PaymentFrequency.Biweekly => start.AddDays(15 * installmentNumber),
            PaymentFrequency.Weekly => start.AddDays(7 * installmentNumber),
            PaymentFrequency.Single => start.AddMonths(installmentNumber),
            _ => start.AddMonths(installmentNumber)
        };
    }
}
