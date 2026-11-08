using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;
using Ledger.Contracts;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Expenses;
using Workspaces.Domain.Services;
using Workspaces.Domain.Workspaces;
using static Workspaces.Application.Services.WorkspaceAccess;

namespace Workspaces.Application.Services;

public interface IWorkspaceExpenseService
{
    Task<Result<WorkspaceExpenseDto>> RegisterAsync(Guid id, RegisterWorkspaceExpenseRequest request, CancellationToken ct = default);
    Task<Result<IReadOnlyList<WorkspaceExpenseDto>>> ListAsync(Guid id, WorkspaceExpenseFilter filter, CancellationToken ct = default);
    Task<Result<WorkspaceExpenseDto>> LinkAccountAsync(Guid id, Guid expenseId, LinkWorkspaceAccountRequest request, CancellationToken ct = default);
}

public sealed class WorkspaceExpenseService(IWorkspaceRepository repository, WorkspaceAccess access, ILedgerModule ledger) : IWorkspaceExpenseService
{
    public Task<Result<WorkspaceExpenseDto>> RegisterAsync(Guid id, RegisterWorkspaceExpenseRequest request, CancellationToken ct = default) =>
        access.WriteLedgerAsync(ledger, async posted =>
        {
            var (workspace, actor) = await access.RequireAsync(id, ct);
            if (request.PaidFromAccountId.HasValue) RequirePayer(actor.Id == request.PaidByMemberId);
            var currency = CurrencyFor(workspace, request.Currency);
            Validate(request.Amount == decimal.Round(request.Amount, currency.DecimalPlaces), "Amount exceeds currency precision.");
            var members = await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == id && x.IsActive, ct);
            Validate(request.Participants is { Count: > 0 } && request.Participants.All(p => p is not null && members.Any(m => m.Id == p.MemberId)),
                "Participants must be active workspace members.");
            Validate(members.Any(x => x.Id == request.PaidByMemberId), "Payer must be an active workspace member.");
            var participants = request.Participants.Select(p => new SplitParticipant(p.MemberId,
                members.Single(m => m.Id == p.MemberId).IncomeSharePercentage, p.CustomPercentage, p.ResponsibilityWeight)).ToArray();
            var amount = new Money(request.Amount, currency);
            var allocations = SplitCalculator.Calculate(amount, request.SplitRuleType, participants,
                participants.Any(x => x.MemberId == request.PaidByMemberId) ? request.PaidByMemberId : null);
            var expense = new WorkspaceExpense(Guid.NewGuid(), id, request.Description, amount, request.PaidByMemberId,
                request.Date, request.SplitRuleType, allocations, request.CategoryId, request.Notes);
            if (request.PaidFromAccountId.HasValue)
                await DebitAsync(expense, request.PaidFromAccountId.Value, posted, ct);
            repository.Add(expense);
            return Map(expense, actor.Id);
        }, ct);

    public Task<Result<IReadOnlyList<WorkspaceExpenseDto>>> ListAsync(Guid id, WorkspaceExpenseFilter filter, CancellationToken ct = default) =>
        ReadAsync<IReadOnlyList<WorkspaceExpenseDto>>(async () =>
        {
            var (_, actor) = await access.RequireAsync(id, ct);
            Validate(filter.Limit is > 0 and <= 500 && filter.Offset >= 0 &&
                (!filter.From.HasValue || !filter.To.HasValue || filter.From <= filter.To), "Invalid expense filters or pagination.");
            var expenses = await repository.ListAsync<WorkspaceExpense>(x => x.WorkspaceId == id &&
                (!filter.From.HasValue || x.Date >= filter.From.Value) && (!filter.To.HasValue || x.Date <= filter.To.Value) &&
                (!filter.CategoryId.HasValue || x.CategoryId == filter.CategoryId.Value) &&
                (!filter.PaidByMemberId.HasValue || x.PaidByMemberId == filter.PaidByMemberId.Value), ct);
            return expenses.OrderByDescending(x => x.Date).ThenBy(x => x.Id).Skip(filter.Offset).Take(filter.Limit)
                .Select(e => Map(e, actor.Id)).ToArray();
        });

    public Task<Result<WorkspaceExpenseDto>> LinkAccountAsync(Guid id, Guid expenseId, LinkWorkspaceAccountRequest request, CancellationToken ct = default) =>
        access.WriteLedgerAsync(ledger, async posted =>
        {
            var (_, actor) = await access.RequireAsync(id, ct);
            var expense = (await repository.ListAsync<WorkspaceExpense>(x => x.WorkspaceId == id && x.Id == expenseId, ct)).SingleOrDefault()
                ?? throw Missing();
            RequirePayer(actor.Id == expense.PaidByMemberId);
            Validate(!expense.PersonalTransactionId.HasValue, "Expense is already linked to the ledger.");
            await DebitAsync(expense, request.AccountId, posted, ct);
            return Map(expense, actor.Id);
        }, ct);

    private async Task DebitAsync(WorkspaceExpense expense, Guid accountId, Action<Guid> posted, CancellationToken ct)
    {
        var result = await ledger.RegisterSharedExpenseAsync(new(access.UserId, accountId, expense.TotalAmount.Amount,
            expense.Currency.Code, expense.CategoryId, expense.Date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc), expense.Description), ct);
        expense.LinkAccount(RequireLedgerTransaction(result, posted), accountId);
    }

    internal static WorkspaceExpenseDto Map(WorkspaceExpense e, Guid callerMemberId) => new(e.Id, e.WorkspaceId, e.Description, e.CategoryId,
        e.TotalAmount.Amount, e.Currency.Code, e.PaidByMemberId, e.Date, e.SplitRuleType, e.Notes,
        e.Allocations.Select(a => new SplitAllocationDto(a.MemberId, a.AllocatedAmount.Amount, a.Percentage)).ToArray(),
        e.PersonalTransactionId.HasValue, e.PaidByMemberId == callerMemberId ? e.PaidFromAccountId : null);
}
