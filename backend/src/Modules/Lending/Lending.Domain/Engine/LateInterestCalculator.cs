using Lending.Domain.Enums;

namespace Lending.Domain.Engine;

public static class LateInterestCalculator
{
    public static decimal Calculate(
        decimal overduePrincipal,
        decimal? lateRate,
        RateUnit unit,
        DayCount dayCount,
        DateOnly dueDate,
        DateOnly paymentDate,
        int graceDays = 0)
    {
        if (overduePrincipal <= decimal.Zero || !lateRate.HasValue || lateRate.Value <= decimal.Zero)
        {
            return decimal.Zero;
        }

        var graceLimitDate = dueDate.AddDays(graceDays);
        var daysLate = Math.Max(0, paymentDate.DayNumber - graceLimitDate.DayNumber);

        if (daysLate <= 0)
        {
            return decimal.Zero;
        }

        var lateDailyRate = LoanMathHelper.CalculateDailyRate(lateRate.Value, unit, dayCount);
        var lateInterest = overduePrincipal * lateDailyRate * daysLate;

        return LoanMathHelper.Round(lateInterest);
    }
}
