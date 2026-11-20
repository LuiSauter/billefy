using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;
using Ledger.Contracts;
using Notifications.Contracts;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Expenses;
using Workspaces.Domain.Services;
using Workspaces.Domain.Settlements;
using Workspaces.Domain.Workspaces;
using static Workspaces.Application.Services.WorkspaceAccess;

namespace Workspaces.Application.Services;

public interface IWorkspaceBalanceService
{
    Task<Result<WorkspaceBalancesDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<SettlementDto>> SettleAsync(Guid id, SettleBalanceRequest request, CancellationToken ct = default);
    Task<Result<IReadOnlyList<SettlementDto>>> ListSettlementsAsync(Guid id, CancellationToken ct = default);
    Task<Result<SettlementDto>> LinkAccountAsync(Guid id, Guid settlementId, LinkWorkspaceAccountRequest request, CancellationToken ct = default);
}

public sealed class WorkspaceBalanceService(IWorkspaceRepository repository, WorkspaceAccess access, ILedgerModule ledger,
    INotificationsModule notifications) : IWorkspaceBalanceService
{
    public Task<Result<WorkspaceBalancesDto>> GetAsync(Guid id, CancellationToken ct = default) => ReadAsync(async () =>
    {
        var (workspace, _) = await access.RequireAsync(id, ct);
        var expenses = await repository.ListAsync<WorkspaceExpense>(x => x.WorkspaceId == id, ct);
        var settlements = await repository.ListAsync<WorkspaceSettlement>(x => x.WorkspaceId == id, ct);
        var members = await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == id, ct);
        var matrix = BalanceMatrixCalculator.Calculate(expenses, settlements);
        var nets = members.Select(m => new MemberNetBalanceDto(m.Id,
            matrix.MemberNetBalances.SingleOrDefault(n => n.MemberId == m.Id && n.Balance.Currency == workspace.BaseCurrency)?.Balance.Amount ?? 0m,
            workspace.BaseCurrency.Code)).ToArray();
        return new WorkspaceBalancesDto(matrix.DebtPairs.Select(x => new PairwiseBalanceDto(x.DebtorMemberId,
            x.CreditorMemberId, x.Amount.Amount, x.Amount.Currency.Code)).ToArray(), nets,
            settlements.OrderByDescending(x => x.SettlementDate).Select(Map).ToArray());
    });

    public async Task<Result<SettlementDto>> SettleAsync(Guid id, SettleBalanceRequest request, CancellationToken ct = default)
    {
        PushNotificationMessage? push = null;
        var result = await access.WriteLedgerAsync(ledger, async posted =>
        {
            push = null;
            var (workspace, actor) = await access.RequireAsync(id, ct);
            if (request.IdempotencyKey.HasValue)
            {
                var existing = (await repository.ListAsync<WorkspaceSettlement>(
                    x => x.WorkspaceId == id && x.IdempotencyKey == request.IdempotencyKey, ct)).SingleOrDefault();
                if (existing is not null) return Map(existing);
            }
            var currency = CurrencyFor(workspace, request.Currency);
            Validate(request.Amount == decimal.Round(request.Amount, currency.DecimalPlaces), "Amount exceeds currency precision.");
            if (request.PayerAccountId.HasValue) RequirePayer(actor.Id == request.PayerMemberId);
            Validate(actor.Id == request.PayerMemberId || actor.CanManage, "Only the payer or a manager can register a settlement.");
            var members = await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == id, ct);
            // Removed members retain their financial history and may still be settled by a manager.
            Validate(members.Any(x => x.Id == request.PayerMemberId) && members.Any(x => x.Id == request.ReceiverMemberId),
                "Settlement participants must belong to this workspace.");
            var expenses = await repository.ListAsync<WorkspaceExpense>(x => x.WorkspaceId == id, ct);
            var settlements = await repository.ListAsync<WorkspaceSettlement>(x => x.WorkspaceId == id, ct);
            var matrix = BalanceMatrixCalculator.Calculate(expenses, settlements);
            var debt = matrix.DebtPairs.SingleOrDefault(x => x.DebtorMemberId == request.PayerMemberId &&
                x.CreditorMemberId == request.ReceiverMemberId && x.Amount.Currency == currency);
            var amount = new Money(request.Amount, currency);
            Validate(amount.Amount > 0m && debt is not null && amount.Amount <= debt.Amount.Amount,
                "Settlement must be positive and cannot exceed the outstanding pairwise debt.");
            var settlement = new WorkspaceSettlement(Guid.NewGuid(), id, request.PayerMemberId, request.ReceiverMemberId,
                amount, request.SettlementDate, SettlementStatus.Completed, request.Notes, request.IdempotencyKey);
            if (request.PayerAccountId.HasValue)
                await PostLegAsync(settlement, actor.Id, request.PayerAccountId.Value, posted, ct);
            repository.Add(settlement);
            push = new PushNotificationMessage("Pago registrado",
                $"Se registró un pago de {Amount(amount.Amount, currency.Code)} en {workspace.Name}",
                new Dictionary<string, string> { ["type"] = "workspace.settlement", ["workspaceId"] = id.ToString() });
            return Map(settlement);
        }, ct);
        // Best-effort and only after the write committed; idempotent replays and rejected writes never notify.
        if (result.IsSuccess && push is not null)
            await access.NotifyOtherMembersAsync(notifications, id, push, ct);
        return result;
    }

    public Task<Result<IReadOnlyList<SettlementDto>>> ListSettlementsAsync(Guid id, CancellationToken ct = default) =>
        ReadAsync<IReadOnlyList<SettlementDto>>(async () =>
        {
            await access.RequireAsync(id, ct);
            return (await repository.ListAsync<WorkspaceSettlement>(x => x.WorkspaceId == id, ct))
                .OrderByDescending(x => x.SettlementDate).ThenBy(x => x.Id).Select(Map).ToArray();
        });

    public Task<Result<SettlementDto>> LinkAccountAsync(Guid id, Guid settlementId, LinkWorkspaceAccountRequest request, CancellationToken ct = default) =>
        access.WriteLedgerAsync(ledger, async posted =>
        {
            var (_, actor) = await access.RequireAsync(id, ct);
            var settlement = (await repository.ListAsync<WorkspaceSettlement>(x => x.WorkspaceId == id && x.Id == settlementId, ct)).SingleOrDefault()
                ?? throw Missing();
            Validate(actor.Id == settlement.PayerMemberId || actor.Id == settlement.ReceiverMemberId,
                "Only a settlement participant may link their account.");
            Validate(settlement.Status == SettlementStatus.Completed, "Only completed settlements may be linked.");
            Validate(actor.Id == settlement.PayerMemberId ? !settlement.PayerTransactionId.HasValue : !settlement.ReceiverTransactionId.HasValue,
                "Your settlement leg is already linked.");
            await PostLegAsync(settlement, actor.Id, request.AccountId, posted, ct);
            return Map(settlement);
        }, ct);

    private async Task PostLegAsync(WorkspaceSettlement settlement, Guid memberId, Guid accountId, Action<Guid> posted, CancellationToken ct)
    {
        var result = await ledger.RegisterWorkspaceSettlementLegAsync(new(access.UserId, accountId, settlement.Amount.Amount,
            settlement.Currency.Code, memberId == settlement.PayerMemberId ? "Outflow" : "Inflow", settlement.Id,
            settlement.SettlementDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc), "Workspace settlement"), ct);
        settlement.LinkLedgerLeg(memberId, RequireLedgerTransaction(result, posted));
    }

    internal static SettlementDto Map(WorkspaceSettlement s) => new(s.Id, s.PayerMemberId, s.ReceiverMemberId,
        s.Amount.Amount, s.Currency.Code, s.SettlementDate, s.Status, s.Notes, s.PayerTransactionId.HasValue, s.ReceiverTransactionId.HasValue);
}
