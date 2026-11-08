using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Budgets;
using Workspaces.Domain.Events;
using Workspaces.Domain.Goals;
using Workspaces.Domain.Workspaces;
using static Workspaces.Application.Services.WorkspaceAccess;

namespace Workspaces.Application.Services;

public interface ISharedCalendarService
{
    Task<Result<IReadOnlyList<SharedFinancialEventDto>>> GetAsync(Guid id, DateOnly from, DateOnly to, CancellationToken ct = default);
    Task<Result<SharedFinancialEventDto>> CreateAsync(Guid id, CreateSharedFinancialEventRequest request, CancellationToken ct = default);
}

public sealed class SharedCalendarService(IWorkspaceRepository repository, WorkspaceAccess access) : ISharedCalendarService
{
    public Task<Result<IReadOnlyList<SharedFinancialEventDto>>> GetAsync(Guid id, DateOnly from, DateOnly to, CancellationToken ct = default) =>
        ReadAsync<IReadOnlyList<SharedFinancialEventDto>>(async () =>
        {
            var (workspace, _) = await access.RequireAsync(id, ct);
            Validate(from <= to && to.DayNumber - from.DayNumber <= 366 && from.Year >= 2 && to.Year <= 9998,
                "Calendar range must be ordered and no longer than 366 days.");
            var events = (await repository.ListAsync<SharedFinancialEvent>(x => x.WorkspaceId == id && x.DueDate >= from && x.DueDate <= to, ct))
                .Select(Map).ToList();
            var budgets = await repository.ListAsync<SharedBudget>(x => x.WorkspaceId == id && x.Year >= from.Year && x.Year <= to.Year, ct);
            foreach (var budget in budgets)
            {
                var close = new DateOnly(budget.Year, budget.Month, DateTime.DaysInMonth(budget.Year, budget.Month));
                if (close >= from && close <= to)
                    events.Add(new SharedFinancialEventDto(Guid.Empty, "Budget close", FinancialEventType.BudgetClose,
                        close, budget.TotalBudgetedAmount.Amount, budget.Currency.Code, Guid.Empty, false, null, true));
            }
            var goals = await repository.ListAsync<SharedGoal>(x => x.WorkspaceId == id && x.Status == SharedGoalStatus.Active, ct);
            // Commitments recur at month end, capped by the goal's target date.
            for (var month = new DateOnly(from.Year, from.Month, 1); month <= to; month = month.AddMonths(1))
            {
                foreach (var goal in goals.Where(x => x.MonthlyCommitmentAmount.Amount > 0m))
                {
                    var due = new DateOnly(month.Year, month.Month, DateTime.DaysInMonth(month.Year, month.Month));
                    if (goal.TargetDate is { } target && target < due) due = target;
                    if (due < month || due < from || due > to) continue;
                    events.Add(new SharedFinancialEventDto(goal.Id, goal.Title, FinancialEventType.GoalContribution,
                        due, goal.MonthlyCommitmentAmount.Amount, workspace.BaseCurrency.Code, Guid.Empty, false, null, true));
                }
            }
            return events.OrderBy(x => x.DueDate).ThenBy(x => x.Title).ToArray();
        });

    public Task<Result<SharedFinancialEventDto>> CreateAsync(Guid id, CreateSharedFinancialEventRequest request, CancellationToken ct = default) =>
        access.WriteAsync(async () =>
        {
            var (workspace, _) = await access.RequireAsync(id, ct);
            var currency = CurrencyFor(workspace, request.Currency);
            var members = await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == id && x.IsActive, ct);
            Validate(members.Any(x => x.Id == request.ResponsibleMemberId), "Responsible member must be active in the workspace.");
            Validate(!string.IsNullOrWhiteSpace(request.Title) && request.Title.Trim().Length <= 150, "A title of at most 150 characters is required.");
            var item = new SharedFinancialEvent(Guid.NewGuid(), id, request.Title, request.FinancialEventType, request.DueDate,
                new Money(request.Amount, currency), request.ResponsibleMemberId, request.Notes);
            repository.Add(item);
            return Map(item);
        }, ct);

    private static SharedFinancialEventDto Map(SharedFinancialEvent e) => new(e.Id, e.Title, e.FinancialEventType,
        e.DueDate, e.Amount.Amount, e.Currency.Code, e.ResponsibleMemberId, e.IsCompleted, e.Notes);
}
