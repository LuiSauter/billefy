using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Workspaces.Contracts;
using Workspaces.Domain.Common;

namespace Workspaces.Domain.Events;

public sealed class SharedFinancialEvent
{
    public Guid Id { get; }
    public Guid WorkspaceId { get; }
    public string Title { get; }
    public FinancialEventType FinancialEventType { get; }
    public DateOnly DueDate { get; }
    public Money Amount { get; }
    public Currency Currency => Amount.Currency;
    public Guid ResponsibleMemberId { get; }
    public string? Notes { get; }
    public bool IsCompleted { get; private set; }

    private SharedFinancialEvent()
    {
        Title = null!;
    }

    public SharedFinancialEvent(Guid id, Guid workspaceId, string title, FinancialEventType financialEventType,
        DateOnly dueDate, Money amount, Guid responsibleMemberId, string? notes = null)
    {
        Id = DomainGuard.Id(id, nameof(id));
        WorkspaceId = DomainGuard.Id(workspaceId, nameof(workspaceId));
        Title = DomainGuard.Text(title, nameof(title));
        FinancialEventType = DomainGuard.Defined(financialEventType, nameof(financialEventType));
        DueDate = dueDate;
        Amount = DomainGuard.Amount(amount, nameof(amount), allowZero: true);
        ResponsibleMemberId = DomainGuard.Id(responsibleMemberId, nameof(responsibleMemberId));
        Notes = notes;
    }

    public void Complete() => IsCompleted = true;
}
