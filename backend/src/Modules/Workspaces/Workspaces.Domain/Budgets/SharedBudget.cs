using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Workspaces.Domain.Common;

namespace Workspaces.Domain.Budgets;

public sealed record SharedBudgetCategory
{
    public Guid CategoryId { get; }
    public Money LimitAmount { get; }

    private SharedBudgetCategory() { }

    public SharedBudgetCategory(Guid categoryId, Money limitAmount)
    {
        CategoryId = DomainGuard.Id(categoryId, nameof(categoryId));
        LimitAmount = DomainGuard.Amount(limitAmount, nameof(limitAmount), allowZero: true);
    }
}

public sealed class SharedBudget
{
    private readonly List<SharedBudgetCategory> _categories = [];

    public Guid WorkspaceId { get; }
    public int Year { get; }
    public int Month { get; }
    public Money TotalBudgetedAmount { get; }
    public Currency Currency => TotalBudgetedAmount.Currency;
    public IReadOnlyList<SharedBudgetCategory> Categories => _categories.AsReadOnly();

    private SharedBudget() { }

    public SharedBudget(Guid workspaceId, int year, int month, Money totalBudgetedAmount,
        IEnumerable<SharedBudgetCategory> categories)
    {
        WorkspaceId = DomainGuard.Id(workspaceId, nameof(workspaceId));
        _ = new DateOnly(year, month, 1);
        Year = year;
        Month = month;
        TotalBudgetedAmount = DomainGuard.Amount(totalBudgetedAmount, nameof(totalBudgetedAmount));
        ArgumentNullException.ThrowIfNull(categories);
        _categories = categories.ToList();
        if (_categories.Any(x => x is null) ||
            _categories.Select(x => x.CategoryId).Distinct().Count() != _categories.Count)
            throw new ArgumentException("Budget categories must be identified and unique.", nameof(categories));
        if (_categories.Any(x => x.LimitAmount.Currency != Currency) ||
            _categories.Sum(x => x.LimitAmount.Amount) > TotalBudgetedAmount.Amount)
            throw new ArgumentException("Category limits must use the budget currency and fit within the total.", nameof(categories));
    }
}
