using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Workspaces.Contracts;
using Workspaces.Domain.Common;

namespace Workspaces.Domain.Expenses;

public sealed class WorkspaceExpense : AggregateRoot
{
    private readonly List<ExpenseSplitAllocation> _allocations;

    public Guid WorkspaceId { get; }
    public string Description { get; }
    public Guid? CategoryId { get; }
    public Money TotalAmount { get; }
    public Currency Currency => TotalAmount.Currency;
    public Guid PaidByMemberId { get; }
    public DateOnly Date { get; }
    public SplitRuleType SplitRuleType { get; }
    public string? Notes { get; }
    public Guid? PersonalTransactionId { get; private set; }
    public Guid? PaidFromAccountId { get; private set; }
    public IReadOnlyList<ExpenseSplitAllocation> Allocations => _allocations.AsReadOnly();

    private WorkspaceExpense()
    {
        Description = null!;
        _allocations = [];
    }

    public WorkspaceExpense(Guid id, Guid workspaceId, string description, Money totalAmount,
        Guid paidByMemberId, DateOnly date, SplitRuleType splitRuleType,
        IEnumerable<ExpenseSplitAllocation> allocations, Guid? categoryId = null,
        string? notes = null, Guid? personalTransactionId = null) : base(id)
    {
        WorkspaceId = DomainGuard.Id(workspaceId, nameof(workspaceId));
        Description = DomainGuard.Text(description, nameof(description));
        TotalAmount = DomainGuard.Amount(totalAmount, nameof(totalAmount));
        PaidByMemberId = DomainGuard.Id(paidByMemberId, nameof(paidByMemberId));
        SplitRuleType = DomainGuard.Defined(splitRuleType, nameof(splitRuleType));
        ArgumentNullException.ThrowIfNull(allocations);
        _allocations = allocations.ToList();
        if (_allocations.Count == 0 || _allocations.Any(x => x is null) ||
            _allocations.Select(x => x.MemberId).Distinct().Count() != _allocations.Count)
            throw new ArgumentException("Allocations must contain unique members.", nameof(allocations));
        if (_allocations.Any(x => x.AllocatedAmount.Currency != totalAmount.Currency) ||
            _allocations.Sum(x => x.AllocatedAmount.Amount) != totalAmount.Amount)
            throw new ArgumentException("Allocation currencies and sum must match the expense.", nameof(allocations));

        Date = date;
        CategoryId = categoryId.HasValue ? DomainGuard.Id(categoryId.Value, nameof(categoryId)) : null;
        Notes = notes;
        PersonalTransactionId = personalTransactionId.HasValue
            ? DomainGuard.Id(personalTransactionId.Value, nameof(personalTransactionId)) : null;
    }

    public void LinkAccount(Guid transactionId, Guid accountId)
    {
        if (PersonalTransactionId.HasValue)
            throw new ArgumentException("Expense is already linked to the ledger.");
        var validTransactionId = DomainGuard.Id(transactionId, nameof(transactionId));
        var validAccountId = DomainGuard.Id(accountId, nameof(accountId));
        PersonalTransactionId = validTransactionId;
        PaidFromAccountId = validAccountId;
    }
}
