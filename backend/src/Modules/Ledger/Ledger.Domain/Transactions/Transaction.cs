using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;

namespace Ledger.Domain.Transactions;

public sealed class Transaction : Entity
{
    private readonly List<TransactionCategoryAllocation> _categoryAllocations = [];
    public IReadOnlyCollection<TransactionCategoryAllocation> CategoryAllocations => _categoryAllocations.AsReadOnly();
    public Guid AccountId { get; private set; }
    public Money Amount { get; private set; }
    public TransactionDirection Direction { get; private set; }
    public Guid? CategoryId { get; private set; }
    public DateTime OccurredAt { get; private set; }
    public string? Description { get; private set; }
    public Guid? ReversesId { get; private set; }
    public Guid? TransferId { get; private set; }
    public decimal? AppliedRate { get; private set; }
    public string? RateSource { get; private set; }

    // Required by EF Core
    private Transaction() : base()
    {
    }

    private Transaction(
        Guid id,
        Guid userId,
        Guid accountId,
        Money amount,
        TransactionDirection direction,
        Guid? categoryId,
        DateTime occurredAt,
        string? description,
        Guid? reversesId,
        Guid? transferId,
        decimal? appliedRate,
        string? rateSource,
        DateTime createdAt,
        IReadOnlyList<TransactionCategoryAllocationInput>? allocations = null)
        : base(id, userId, createdAt)
    {
        if (accountId == Guid.Empty)
        {
            throw new ArgumentException("AccountId cannot be empty.", nameof(accountId));
        }

        if (amount.Amount <= decimal.Zero)
        {
            throw new ArgumentException("Transaction amount must be strictly greater than zero.", nameof(amount));
        }

        AccountId = accountId;
        Amount = amount;
        Direction = direction;
        CategoryId = categoryId;
        OccurredAt = occurredAt;
        Description = description?.Trim();
        ReversesId = reversesId;
        TransferId = transferId;
        AppliedRate = appliedRate;
        RateSource = rateSource?.Trim();
        AddAllocations(allocations);
    }

    private void AddAllocations(IReadOnlyList<TransactionCategoryAllocationInput>? allocations)
    {
        if (allocations is null || allocations.Count == 0) return;
        if (TransferId.HasValue) throw new ArgumentException("Transfers cannot carry allocations.", nameof(allocations));
        if (allocations.Any(allocation => allocation.CategoryId == Guid.Empty))
            throw new ArgumentException("Allocation category IDs must be valid.", nameof(allocations));
        if (allocations.Select(allocation => allocation.CategoryId).Distinct().Count() != allocations.Count)
            throw new ArgumentException("Allocations cannot contain a duplicate category.", nameof(allocations));
        foreach (var allocation in allocations)
        {
            if (decimal.Round(allocation.Amount, Amount.Currency.DecimalPlaces) != allocation.Amount)
                throw new ArgumentException("Allocation amount exceeds the transaction currency precision.", nameof(allocations));
            _categoryAllocations.Add(TransactionCategoryAllocation.Create(UserId, Id, allocation.CategoryId, allocation.Amount, CreatedAt));
        }
        if (_categoryAllocations.Sum(allocation => allocation.Amount) != Amount.Amount)
            throw new ArgumentException("Allocation sum must equal the parent amount.", nameof(allocations));
    }

    public static Transaction Create(
        Guid userId,
        Guid accountId,
        Money amount,
        TransactionDirection direction,
        Guid? categoryId,
        DateTime occurredAt,
        string? description,
        decimal? appliedRate = null,
        string? rateSource = null,
        DateTime? createdAt = null,
        IReadOnlyList<TransactionCategoryAllocationInput>? allocations = null)
    {
        return new Transaction(
            Guid.NewGuid(),
            userId,
            accountId,
            amount,
            direction,
            categoryId,
            occurredAt,
            description,
            reversesId: null,
            transferId: null,
            appliedRate: appliedRate,
            rateSource: rateSource,
            createdAt: createdAt ?? DateTime.UtcNow,
            allocations: allocations);
    }

    public static Transaction CreateReversal(
        Transaction original,
        DateTime occurredAt,
        string? reason = null,
        DateTime? createdAt = null)
    {
        ArgumentNullException.ThrowIfNull(original);

        var oppositeDirection = original.Direction == TransactionDirection.Income
            ? TransactionDirection.Expense
            : TransactionDirection.Income;

        var description = string.IsNullOrWhiteSpace(reason)
            ? $"Reversal of transaction {original.Id}"
            : $"Reversal of transaction {original.Id}: {reason.Trim()}";

        return new Transaction(
            Guid.NewGuid(),
            original.UserId,
            original.AccountId,
            original.Amount,
            oppositeDirection,
            original.CategoryId,
            occurredAt,
            description,
            reversesId: original.Id,
            transferId: null,
            appliedRate: original.AppliedRate,
            rateSource: original.RateSource,
            createdAt: createdAt ?? DateTime.UtcNow,
            allocations: original.CategoryAllocations.Select(allocation => new TransactionCategoryAllocationInput(allocation.CategoryId, allocation.Amount)).ToArray());
    }

    public static (Transaction Outflow, Transaction Inflow) CreateTransferReversal(
        Transaction originalOutflow,
        Transaction originalInflow,
        DateTime occurredAt,
        string? reason = null,
        DateTime? createdAt = null)
    {
        ArgumentNullException.ThrowIfNull(originalOutflow);
        ArgumentNullException.ThrowIfNull(originalInflow);
        if (originalOutflow.TransferId is null || originalOutflow.TransferId != originalInflow.TransferId ||
            originalOutflow.Direction != TransactionDirection.Expense || originalInflow.Direction != TransactionDirection.Income ||
            originalOutflow.UserId != originalInflow.UserId)
        {
            throw new ArgumentException("A transfer reversal requires both original legs of the same transfer.");
        }

        var transferId = Guid.NewGuid();
        var now = createdAt ?? DateTime.UtcNow;
        var suffix = string.IsNullOrWhiteSpace(reason) ? "" : $": {reason.Trim()}";
        var outflow = new Transaction(Guid.NewGuid(), originalOutflow.UserId, originalOutflow.AccountId,
            originalOutflow.Amount, TransactionDirection.Income, null, occurredAt,
            $"Reversal of transfer {originalOutflow.TransferId}{suffix}", originalOutflow.Id, transferId,
            originalOutflow.AppliedRate, originalOutflow.RateSource, now);
        var inflow = new Transaction(Guid.NewGuid(), originalInflow.UserId, originalInflow.AccountId,
            originalInflow.Amount, TransactionDirection.Expense, null, occurredAt,
            $"Reversal of transfer {originalOutflow.TransferId}{suffix}", originalInflow.Id, transferId,
            originalInflow.AppliedRate, originalInflow.RateSource, now);
        return (outflow, inflow);
    }

    public static (Transaction Outflow, Transaction Inflow) CreateTransfer(
        Guid userId,
        Guid sourceAccountId,
        Money sourceAmount,
        Guid destinationAccountId,
        Money destinationAmount,
        DateTime occurredAt,
        decimal? appliedRate,
        string? rateSource,
        string? description,
        DateTime? createdAt = null,
        IReadOnlyList<TransactionCategoryAllocationInput>? sourceAllocations = null,
        IReadOnlyList<TransactionCategoryAllocationInput>? destinationAllocations = null)
    {
        if (sourceAllocations is { Count: > 0 } || destinationAllocations is { Count: > 0 })
            throw new ArgumentException("Transfers cannot carry allocations.");
        if (sourceAccountId == destinationAccountId)
        {
            throw new InvalidOperationException("Source and destination accounts must be distinct for a transfer.");
        }

        var transferId = Guid.NewGuid();
        var now = createdAt ?? DateTime.UtcNow;

        var outflow = new Transaction(
            Guid.NewGuid(),
            userId,
            sourceAccountId,
            sourceAmount,
            TransactionDirection.Expense,
            categoryId: null,
            occurredAt: occurredAt,
            description: description ?? "Transfer Out",
            reversesId: null,
            transferId: transferId,
            appliedRate: appliedRate,
            rateSource: rateSource,
            createdAt: now);

        var inflow = new Transaction(
            Guid.NewGuid(),
            userId,
            destinationAccountId,
            destinationAmount,
            TransactionDirection.Income,
            categoryId: null,
            occurredAt: occurredAt,
            description: description ?? "Transfer In",
            reversesId: null,
            transferId: transferId,
            appliedRate: appliedRate,
            rateSource: rateSource,
            createdAt: now);

        return (outflow, inflow);
    }
}
