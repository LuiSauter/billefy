using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Workspaces.Contracts;
using Workspaces.Domain.Common;

namespace Workspaces.Domain.Settlements;

public sealed class WorkspaceSettlement : AggregateRoot
{
    public Guid WorkspaceId { get; }
    public Guid PayerMemberId { get; }
    public Guid ReceiverMemberId { get; }
    public Money Amount { get; }
    public Currency Currency => Amount.Currency;
    public DateOnly SettlementDate { get; }
    public SettlementStatus Status { get; private set; }
    public string? Notes { get; }
    public Guid? PayerTransactionId { get; private set; }
    public Guid? ReceiverTransactionId { get; private set; }

    private WorkspaceSettlement() { }

    public WorkspaceSettlement(Guid id, Guid workspaceId, Guid payerMemberId, Guid receiverMemberId,
        Money amount, DateOnly settlementDate, SettlementStatus status = SettlementStatus.Pending,
        string? notes = null) : base(id)
    {
        WorkspaceId = DomainGuard.Id(workspaceId, nameof(workspaceId));
        PayerMemberId = DomainGuard.Id(payerMemberId, nameof(payerMemberId));
        ReceiverMemberId = DomainGuard.Id(receiverMemberId, nameof(receiverMemberId));
        if (payerMemberId == receiverMemberId)
            throw new ArgumentException("A settlement must be between different members.", nameof(receiverMemberId));
        Amount = DomainGuard.Amount(amount, nameof(amount));
        SettlementDate = settlementDate;
        Status = DomainGuard.Defined(status, nameof(status));
        Notes = notes;
    }

    public void Complete() => Status = SettlementStatus.Completed;

    public void LinkLedgerLeg(Guid memberId, Guid transactionId)
    {
        var validTransactionId = DomainGuard.Id(transactionId, nameof(transactionId));
        if (Status != SettlementStatus.Completed)
            throw new ArgumentException("Only completed settlements can be linked.");
        if (memberId == PayerMemberId && !PayerTransactionId.HasValue)
            PayerTransactionId = validTransactionId;
        else if (memberId == ReceiverMemberId && !ReceiverTransactionId.HasValue)
            ReceiverTransactionId = validTransactionId;
        else
            throw new ArgumentException("Only an unlinked settlement participant can link a leg.");
    }
}
