using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;

namespace Planning.Domain.Budgets;

public sealed record BudgetConsumption(
    decimal SpentAmount,
    decimal LimitAmount,
    decimal RemainingAmount,
    decimal PercentageUsed,
    bool IsAlertTriggered,
    bool IsExceeded);

public sealed class Budget : Entity
{
    public Guid? CategoryId { get; private set; }
    public string Period { get; private set; }
    public Money LimitAmount { get; private set; }
    public decimal AlertThreshold { get; private set; }
    public bool IsActive { get; private set; }

    private Budget() : base()
    {
        Period = "monthly";
        LimitAmount = Money.Zero(Currency.USD);
        AlertThreshold = 0.80m;
        IsActive = true;
    }

    public Budget(
        Guid id,
        Guid userId,
        Guid? categoryId,
        string period,
        Money limitAmount,
        decimal alertThreshold,
        bool isActive,
        DateTime createdAt)
        : base(id, userId, createdAt)
    {
        if (limitAmount.Amount <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(limitAmount), "Budget limit must be strictly positive.");

        if (alertThreshold <= decimal.Zero || alertThreshold > 1.0m)
            throw new ArgumentOutOfRangeException(nameof(alertThreshold), "Alert threshold must be between 0.01 and 1.00 (e.g. 0.80 for 80%).");

        CategoryId = categoryId;
        Period = string.IsNullOrWhiteSpace(period) ? "monthly" : period.Trim().ToLowerInvariant();
        LimitAmount = limitAmount;
        AlertThreshold = alertThreshold;
        IsActive = isActive;
    }

    public static Budget Create(
        Guid userId,
        Guid? categoryId,
        Money limitAmount,
        decimal alertThreshold = 0.80m,
        string period = "monthly",
        DateTime? createdAt = null)
    {
        return new Budget(
            Guid.NewGuid(),
            userId,
            categoryId,
            period,
            limitAmount,
            alertThreshold,
            isActive: true,
            createdAt: createdAt ?? DateTime.UtcNow);
    }

    public void UpdateLimit(Money newLimit, decimal alertThreshold)
    {
        if (newLimit.Amount <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(newLimit), "Budget limit must be strictly positive.");

        if (alertThreshold <= decimal.Zero || alertThreshold > 1.0m)
            throw new ArgumentOutOfRangeException(nameof(alertThreshold), "Alert threshold must be between 0.01 and 1.00.");

        LimitAmount = newLimit;
        AlertThreshold = alertThreshold;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;

    public BudgetConsumption EvaluateConsumption(decimal spentAmount)
    {
        var spent = Math.Max(decimal.Zero, spentAmount);
        var limit = LimitAmount.Amount;
        var remaining = Math.Max(decimal.Zero, limit - spent);
        var percentage = limit > decimal.Zero ? Math.Round((spent / limit) * 100m, 2) : 100m;
        var alertThresholdPercent = AlertThreshold * 100m;

        var isAlert = percentage >= alertThresholdPercent;
        var isExceeded = spent > limit;

        return new BudgetConsumption(
            spent,
            limit,
            remaining,
            percentage,
            isAlert,
            isExceeded);
    }
}
