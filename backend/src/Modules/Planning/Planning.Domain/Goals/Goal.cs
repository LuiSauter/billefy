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

public enum GoalFundingMode
{
    AccountTracking = 0,
    ReservedFunds = 1
}

public sealed class Goal : Entity
{
    public Guid? AccountId { get; private set; }
    public GoalFundingMode FundingMode { get; private set; }
    public long FundingRevision { get; private set; }
    public void AdvanceFundingRevision() => FundingRevision = checked(FundingRevision + 1);
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
        DateTime createdAt,
        GoalFundingMode fundingMode = GoalFundingMode.AccountTracking)
        : base(id, userId, createdAt)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Goal name cannot be empty.", nameof(name));

        if (targetAmount.Amount <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(targetAmount), "Goal target amount must be positive.");

        if (!Enum.IsDefined(fundingMode))
            throw new ArgumentOutOfRangeException(nameof(fundingMode), "Unknown goal funding mode.");

        if (fundingMode == GoalFundingMode.ReservedFunds && (!accountId.HasValue || accountId == Guid.Empty))
            throw new ArgumentException("Reserved-funds goals require a linked account.", nameof(accountId));

        AccountId = accountId;
        FundingMode = fundingMode;
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
        DateTime? createdAt = null,
        GoalFundingMode fundingMode = GoalFundingMode.AccountTracking)
    {
        return new Goal(
            Guid.NewGuid(),
            userId,
            accountId,
            name,
            targetAmount,
            targetDate,
            createdAt ?? DateTime.UtcNow,
            fundingMode);
    }

    public void Update(string name, Money targetAmount, DateOnly? targetDate, Guid? accountId)
    {
        if (FundingMode == GoalFundingMode.ReservedFunds && (!accountId.HasValue || accountId == Guid.Empty))
            throw new ArgumentException("Reserved-funds goals require a linked account.", nameof(accountId));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Goal name cannot be empty.", nameof(name));

        if (targetAmount.Amount <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(targetAmount), "Goal target amount must be positive.");

        if (FundingMode == GoalFundingMode.ReservedFunds) AdvanceFundingRevision();
        AccountId = accountId;
        Name = name.Trim();
        TargetAmount = targetAmount;
        TargetDate = targetDate;
    }

    public GoalProgress EvaluateProgress(decimal currentBalance, DateOnly currentDate)
    {
        var current = currentBalance;
        var target = TargetAmount.Amount;
        var remaining = Money.RoundToScale(Math.Max(decimal.Zero, target - current), TargetAmount.Currency.DecimalPlaces);
        var percentage = target > decimal.Zero
            ? Math.Round((current / target) * 100m, 2, MidpointRounding.AwayFromZero)
            : 100m;

        int? monthsRemaining = null;
        decimal? monthlyContribution = null;

        if (TargetDate is { } targetDate && targetDate > currentDate && remaining > decimal.Zero)
        {
            var months = ((targetDate.Year - currentDate.Year) * 12) + (targetDate.Month - currentDate.Month);
            var safeMonths = Math.Max(1, months);

            monthsRemaining = safeMonths;
            monthlyContribution = Money.RoundToScale(remaining / safeMonths, TargetAmount.Currency.DecimalPlaces);
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
