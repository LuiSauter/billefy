using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;

namespace Planning.Domain.Goals;

public sealed record GoalProgress(
    decimal CurrentAmount,
    decimal TargetAmount,
    decimal RemainingAmount,
    decimal PercentageAchieved,
    int? MonthsRemaining,
    decimal? MonthlyContributionNeeded);

public sealed class Goal : Entity
{
    public Guid? AccountId { get; private set; }
    public string Name { get; private set; }
    public Money TargetAmount { get; private set; }
    public DateOnly? TargetDate { get; private set; }

    private Goal() : base()
    {
        Name = string.Empty;
        TargetAmount = Money.Zero(Currency.USD);
    }

    public Goal(
        Guid id,
        Guid userId,
        Guid? accountId,
        string name,
        Money targetAmount,
        DateOnly? targetDate,
        DateTime createdAt)
        : base(id, userId, createdAt)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Goal name cannot be empty.", nameof(name));

        if (targetAmount.Amount <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(targetAmount), "Goal target amount must be positive.");

        AccountId = accountId;
        Name = name.Trim();
        TargetAmount = targetAmount;
        TargetDate = targetDate;
    }

    public static Goal Create(
        Guid userId,
        string name,
        Money targetAmount,
        DateOnly? targetDate,
        Guid? accountId,
        DateTime? createdAt = null)
    {
        return new Goal(
            Guid.NewGuid(),
            userId,
            accountId,
            name,
            targetAmount,
            targetDate,
            createdAt ?? DateTime.UtcNow);
    }

    public GoalProgress EvaluateProgress(decimal currentBalance, DateOnly currentDate)
    {
        var current = Math.Max(decimal.Zero, currentBalance);
        var target = TargetAmount.Amount;
        var remaining = Math.Max(decimal.Zero, target - current);
        var percentage = target > decimal.Zero
            ? Math.Round((current / target) * 100m, 2)
            : 100m;

        int? monthsRemaining = null;
        decimal? monthlyContribution = null;

        if (TargetDate.HasValue)
        {
            var targetDate = TargetDate.Value;
            var months = ((targetDate.Year - currentDate.Year) * 12) + (targetDate.Month - currentDate.Month);
            var safeMonths = Math.Max(1, months);

            monthsRemaining = safeMonths;
            monthlyContribution = Math.Round(remaining / safeMonths, 2);
        }

        return new GoalProgress(
            current,
            target,
            remaining,
            percentage,
            monthsRemaining,
            monthlyContribution);
    }
}
