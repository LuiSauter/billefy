using BuildingBlocks.Common;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Expenses;
using Workspaces.Domain.Goals;
using Workspaces.Domain.Income;
using static Workspaces.Application.Services.WorkspaceAccess;

namespace Workspaces.Application.Services;

public interface IWorkspaceReportService
{
    Task<Result<WorkspaceMonthlyReportDto>> GetAsync(Guid id, int year, int month, CancellationToken ct = default);
}

public sealed class WorkspaceReportService(IWorkspaceRepository repository, WorkspaceAccess access) : IWorkspaceReportService
{
    public Task<Result<WorkspaceMonthlyReportDto>> GetAsync(Guid id, int year, int month, CancellationToken ct = default) =>
        ReadAsync(async () =>
        {
            var (workspace, _) = await access.RequireAsync(id, ct);
            var start = Period(year, month);
            var previous = start.AddMonths(-1);
            var end = start.AddMonths(1);
            var expenses = await repository.ListAsync<WorkspaceExpense>(x => x.WorkspaceId == id && x.Date >= previous && x.Date < end, ct);
            var incomes = await repository.ListAsync<WorkspaceIncome>(x => x.WorkspaceId == id && x.Date >= previous && x.Date < end, ct);
            var current = expenses.Where(x => x.Date >= start && x.Currency == workspace.BaseCurrency).ToArray();
            var total = current.Sum(x => x.TotalAmount.Amount);
            var previousTotal = expenses.Where(x => x.Date < start && x.Currency == workspace.BaseCurrency).Sum(x => x.TotalAmount.Amount);
            var income = incomes.Where(x => x.Date >= start && x.Currency == workspace.BaseCurrency).Sum(x => x.Amount.Amount);
            var previousIncome = incomes.Where(x => x.Date < start && x.Currency == workspace.BaseCurrency).Sum(x => x.Amount.Amount);
            var goals = await repository.ListAsync<SharedGoal>(x => x.WorkspaceId == id, ct);
            var savings = goals.SelectMany(x => x.MemberContributions)
                .Where(x => DateOnly.FromDateTime(x.ContributedAt) >= start && DateOnly.FromDateTime(x.ContributedAt) < end)
                .Sum(x => x.Amount.Amount);
            // Only recorded workspace income is included; personal ledger and settlements are excluded.
            return new WorkspaceMonthlyReportDto(year, month, workspace.BaseCurrency.Code, income, total, savings,
                previousIncome, previousTotal, previousTotal == 0m ? null : (total - previousTotal) / previousTotal * 100m, Categories(current));
        });

    internal static IReadOnlyList<WorkspaceCategoryBreakdownDto> Categories(IReadOnlyList<WorkspaceExpense> expenses)
    {
        var total = expenses.Sum(x => x.TotalAmount.Amount);
        return expenses.GroupBy(x => x.CategoryId).OrderBy(x => x.Key).Select(g =>
        {
            var amount = g.Sum(x => x.TotalAmount.Amount);
            return new WorkspaceCategoryBreakdownDto(g.Key, amount, total == 0m ? 0m : amount / total * 100m);
        }).ToArray();
    }
}
