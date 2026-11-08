using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Workspaces.Domain.Common;

namespace Workspaces.Domain.Income;

public sealed class WorkspaceIncome : AggregateRoot
{
    public Guid WorkspaceId { get; }
    public string Description { get; }
    public Money Amount { get; }
    public Currency Currency => Amount.Currency;
    public Guid ReceivedByMemberId { get; }
    public DateOnly Date { get; }
    public Guid? CategoryId { get; }
    public string? Notes { get; }
    public Guid? PersonalTransactionId { get; private set; }
    public Guid? ReceivedToAccountId { get; private set; }

    private WorkspaceIncome() => Description = null!;

    public WorkspaceIncome(Guid id, Guid workspaceId, string description, Money amount, Guid receivedByMemberId,
        DateOnly date, Guid? categoryId = null, string? notes = null) : base(id)
    {
        WorkspaceId = DomainGuard.Id(workspaceId, nameof(workspaceId));
        Description = DomainGuard.Text(description, nameof(description));
        Amount = DomainGuard.Amount(amount, nameof(amount));
        ReceivedByMemberId = DomainGuard.Id(receivedByMemberId, nameof(receivedByMemberId));
        Date = date;
        CategoryId = categoryId.HasValue ? DomainGuard.Id(categoryId.Value, nameof(categoryId)) : null;
        Notes = notes;
    }

    public void LinkAccount(Guid transactionId, Guid accountId)
    {
        if (PersonalTransactionId.HasValue)
            throw new ArgumentException("Income is already linked to the ledger.");
        PersonalTransactionId = DomainGuard.Id(transactionId, nameof(transactionId));
        ReceivedToAccountId = DomainGuard.Id(accountId, nameof(accountId));
    }
}
