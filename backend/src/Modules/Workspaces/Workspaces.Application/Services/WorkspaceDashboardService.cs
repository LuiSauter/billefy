using BuildingBlocks.Common;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Budgets;
using Workspaces.Domain.Expenses;
using Workspaces.Domain.Goals;
using Workspaces.Domain.Income;
using Workspaces.Domain.Services;
using Workspaces.Domain.Settlements;
using Workspaces.Domain.Workspaces;
using static Workspaces.Application.Services.WorkspaceAccess;

namespace Workspaces.Application.Services;

public interface IWorkspaceDashboardService
{
    Task<Result<WorkspaceDashboardDto>> GetAsync(Guid id, int year, int month, CancellationToken ct = default);
}

public sealed class WorkspaceDashboardService(IWorkspaceRepository repository, WorkspaceAccess access) : IWorkspaceDashboardService
{
    public Task<Result<WorkspaceDashboardDto>> GetAsync(Guid id, int year, int month, CancellationToken ct = default) =>
        ReadAsync(async () =>
        {
            var (workspace, _) = await access.RequireAsync(id, ct);
            var start = Period(year, month);
            var end = start.AddMonths(1);
            var expenses = await repository.ListAsync<WorkspaceExpense>(x => x.WorkspaceId == id, ct);
            var incomes = await repository.ListAsync<WorkspaceIncome>(x => x.WorkspaceId == id, ct);
            var settlements = await repository.ListAsync<WorkspaceSettlement>(x => x.WorkspaceId == id, ct);
            var members = await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == id, ct);
            var goals = await repository.ListAsync<SharedGoal>(x => x.WorkspaceId == id, ct);
            var budget = (await repository.ListAsync<SharedBudget>(x => x.WorkspaceId == id && x.Year == year && x.Month == month, ct)).SingleOrDefault();
            var current = expenses.Where(x => x.Date >= start && x.Date < end && x.Currency == workspace.BaseCurrency).ToArray();
            var matrix = BalanceMatrixCalculator.Calculate(expenses, settlements);
            var debts = matrix.DebtPairs.Select(x => new PairwiseBalanceDto(x.DebtorMemberId, x.CreditorMemberId,
                x.Amount.Amount, x.Amount.Currency.Code)).ToArray();
            var nets = members.Select(m => new MemberNetBalanceDto(m.Id,
                matrix.MemberNetBalances.SingleOrDefault(x => x.MemberId == m.Id && x.Balance.Currency == workspace.BaseCurrency)?.Balance.Amount ?? 0m,
                workspace.BaseCurrency.Code)).ToArray();
            var balances = new WorkspaceBalancesDto(debts, nets, settlements.Select(WorkspaceBalanceService.Map).ToArray());
            var contributions = goals.SelectMany(x => x.MemberContributions).Where(x => DateOnly.FromDateTime(x.ContributedAt) >= start &&
                DateOnly.FromDateTime(x.ContributedAt) < end).ToArray();
            var statuses = workspace.Settings.ShowIndividualContributions ? members.Select(m => new MemberContributionStatusDto(m.Id,
                current.Where(x => x.PaidByMemberId == m.Id).Sum(x => x.TotalAmount.Amount),
                current.SelectMany(x => x.Allocations).Where(x => x.MemberId == m.Id).Sum(x => x.AllocatedAmount.Amount),
                contributions.Where(x => x.MemberId == m.Id).Sum(x => x.Amount.Amount), nets.Single(x => x.MemberId == m.Id).Balance)).ToArray() : [];
            var budgetDto = budget is null ? null : SharedBudgetService.Map(budget, current);
            // Balance is recorded shared cash flow, not personal patrimony or a stored account balance.
            var workspaceIncomes = incomes.Where(x => x.Currency == workspace.BaseCurrency).ToArray();
            var monthlyIncomes = workspaceIncomes.Where(x => x.Date >= start && x.Date < end).ToArray();
            return new WorkspaceDashboardDto(id, year, month, workspace.BaseCurrency.Code,
                workspaceIncomes.Sum(x => x.Amount.Amount) - expenses.Where(x => x.Currency == workspace.BaseCurrency).Sum(x => x.TotalAmount.Amount),
                monthlyIncomes.Sum(x => x.Amount.Amount), current.Sum(x => x.TotalAmount.Amount), contributions.Sum(x => x.Amount.Amount),
                budgetDto?.ExecutionPercentage ?? 0m, WorkspaceReportService.Categories(current), statuses, debts, balances, budgetDto);
        });
}
