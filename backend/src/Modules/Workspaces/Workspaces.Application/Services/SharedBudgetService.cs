using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Budgets;
using Workspaces.Domain.Expenses;
using static Workspaces.Application.Services.WorkspaceAccess;

namespace Workspaces.Application.Services;

public interface ISharedBudgetService
{
    Task<Result<SharedBudgetDto>> SetAsync(Guid id, SetSharedBudgetRequest request, CancellationToken ct = default);
    Task<Result<SharedBudgetDto?>> GetAsync(Guid id, int year, int month, CancellationToken ct = default);
}

public sealed class SharedBudgetService(IWorkspaceRepository repository, WorkspaceAccess access) : ISharedBudgetService
{
    public Task<Result<SharedBudgetDto>> SetAsync(Guid id, SetSharedBudgetRequest request, CancellationToken ct = default) =>
        access.WriteAsync(async () =>
        {
            var (workspace, _) = await access.RequireAsync(id, ct, manage: true);
            var start = Period(request.Year, request.Month);
            var currency = CurrencyFor(workspace, request.Currency);
            Validate(request.Categories is not null && request.Categories.All(x => x is not null), "Categories are required.");
            var budget = new SharedBudget(id, request.Year, request.Month, new Money(request.Amount, currency),
                request.Categories.Select(x => new SharedBudgetCategory(x.CategoryId, new Money(x.LimitAmount, currency))));
            await repository.SetBudgetAsync(budget, ct);
            var end = start.AddMonths(1);
            var expenses = await repository.ListAsync<WorkspaceExpense>(x => x.WorkspaceId == id && x.Date >= start && x.Date < end, ct);
            return Map(budget, expenses);
        }, ct);

    public Task<Result<SharedBudgetDto?>> GetAsync(Guid id, int year, int month, CancellationToken ct = default) =>
        ReadAsync<SharedBudgetDto?>(async () =>
        {
            await access.RequireAsync(id, ct);
            var start = Period(year, month);
            var end = start.AddMonths(1);
            var budget = (await repository.ListAsync<SharedBudget>(x => x.WorkspaceId == id && x.Year == year && x.Month == month, ct)).SingleOrDefault();
            if (budget is null) return null;
            var expenses = await repository.ListAsync<WorkspaceExpense>(x => x.WorkspaceId == id && x.Date >= start && x.Date < end, ct);
            return Map(budget, expenses);
        });

    internal static SharedBudgetDto Map(SharedBudget budget, IReadOnlyList<WorkspaceExpense> expenses)
    {
        var matching = expenses.Where(x => x.Currency == budget.Currency).ToArray();
        var spent = matching.Sum(x => x.TotalAmount.Amount);
        return new SharedBudgetDto(budget.Year, budget.Month, budget.TotalBudgetedAmount.Amount, budget.Currency.Code,
            spent, budget.TotalBudgetedAmount.Amount - spent, spent / budget.TotalBudgetedAmount.Amount * 100m,
            budget.Categories.Select(c =>
            {
                var categorySpent = matching.Where(x => x.CategoryId == c.CategoryId).Sum(x => x.TotalAmount.Amount);
                return new SharedBudgetCategoryDto(c.CategoryId, c.LimitAmount.Amount, categorySpent, c.LimitAmount.Amount - categorySpent);
            }).ToArray());
    }
}
