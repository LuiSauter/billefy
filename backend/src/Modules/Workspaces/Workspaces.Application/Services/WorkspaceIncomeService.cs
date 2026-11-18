using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;
using Ledger.Contracts;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Income;
using Workspaces.Domain.Workspaces;
using static Workspaces.Application.Services.WorkspaceAccess;

namespace Workspaces.Application.Services;

public interface IWorkspaceIncomeService
{
    Task<Result<WorkspaceIncomeDto>> RegisterAsync(Guid id, RegisterWorkspaceIncomeRequest request, CancellationToken ct = default);
    Task<Result<IReadOnlyList<WorkspaceIncomeDto>>> ListAsync(Guid id, WorkspaceIncomeFilter filter, CancellationToken ct = default);
    Task<Result<WorkspaceIncomeDto>> LinkAccountAsync(Guid id, Guid incomeId, LinkWorkspaceIncomeAccountRequest request, CancellationToken ct = default);
}

public sealed class WorkspaceIncomeService(IWorkspaceRepository repository, WorkspaceAccess access, ILedgerModule ledger) : IWorkspaceIncomeService
{
    public Task<Result<WorkspaceIncomeDto>> RegisterAsync(Guid id, RegisterWorkspaceIncomeRequest request, CancellationToken ct = default) =>
        access.WriteLedgerAsync(ledger, async posted =>
        {
            var (workspace, actor) = await access.RequireAsync(id, ct);
            if (request.IdempotencyKey.HasValue)
            {
                var existing = (await repository.ListAsync<WorkspaceIncome>(
                    x => x.WorkspaceId == id && x.IdempotencyKey == request.IdempotencyKey, ct)).SingleOrDefault();
                if (existing is not null) return Map(existing, actor.Id);
            }
            var currency = CurrencyFor(workspace, request.Currency);
            Validate(request.Amount == decimal.Round(request.Amount, currency.DecimalPlaces), "Amount exceeds currency precision.");
            var members = await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == id && x.IsActive, ct);
            var receiver = members.SingleOrDefault(x => x.Id == request.ReceivedByMemberId);
            Validate(receiver is not null, "Receiver must be an active workspace member.");
            if (request.ReceivedToAccountId.HasValue) RequirePayer(actor.Id == receiver!.Id);
            // Income category ownership is validated by the ledger when the income is linked to an account;
            // there is no income-category lookup on ILedgerModule yet, so unlinked income is not pre-validated (follow-up).
            var income = new WorkspaceIncome(Guid.NewGuid(), id, request.Description,
                new Money(request.Amount, currency), receiver!.Id, request.Date, request.CategoryId, request.Notes,
                request.IdempotencyKey);
            if (request.ReceivedToAccountId.HasValue)
                await CreditAsync(income, request.ReceivedToAccountId.Value, posted, ct);
            repository.Add(income);
            return Map(income, actor.Id);
        }, ct);

    public Task<Result<IReadOnlyList<WorkspaceIncomeDto>>> ListAsync(Guid id, WorkspaceIncomeFilter filter, CancellationToken ct = default) =>
        ReadAsync<IReadOnlyList<WorkspaceIncomeDto>>(async () =>
        {
            var (_, actor) = await access.RequireAsync(id, ct);
            Validate(filter.Limit is > 0 and <= 500 && filter.Offset >= 0 &&
                (!filter.From.HasValue || !filter.To.HasValue || filter.From <= filter.To), "Invalid income filters or pagination.");
            var incomes = await repository.ListIncomesAsync(id, filter.From, filter.To, filter.CategoryId,
                filter.ReceivedByMemberId, filter.Limit, filter.Offset, ct);
            return incomes.Select(x => Map(x, actor.Id)).ToArray();
        });

    public Task<Result<WorkspaceIncomeDto>> LinkAccountAsync(Guid id, Guid incomeId, LinkWorkspaceIncomeAccountRequest request, CancellationToken ct = default) =>
        access.WriteLedgerAsync(ledger, async posted =>
        {
            var (_, actor) = await access.RequireAsync(id, ct);
            var income = (await repository.ListAsync<WorkspaceIncome>(x => x.WorkspaceId == id && x.Id == incomeId, ct)).SingleOrDefault()
                ?? throw Missing();
            RequirePayer(actor.Id == income.ReceivedByMemberId);
            Validate(!income.PersonalTransactionId.HasValue, "Income is already linked to the ledger.");
            await CreditAsync(income, request.AccountId, posted, ct);
            return Map(income, actor.Id);
        }, ct);

    private async Task CreditAsync(WorkspaceIncome income, Guid accountId, Action<Guid> posted, CancellationToken ct)
    {
        var result = await ledger.RegisterSharedIncomeAsync(new(access.UserId, accountId, income.Amount.Amount,
            income.Currency.Code, income.CategoryId, income.Date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc), income.Description), ct);
        income.LinkAccount(RequireLedgerTransaction(result, posted), accountId);
    }

    internal static WorkspaceIncomeDto Map(WorkspaceIncome income, Guid callerMemberId) => new(income.Id, income.WorkspaceId,
        income.Description, income.CategoryId, income.Amount.Amount, income.Currency.Code, income.ReceivedByMemberId,
        income.Date, income.Notes, income.PersonalTransactionId.HasValue,
        income.ReceivedByMemberId == callerMemberId ? income.ReceivedToAccountId : null);
}
