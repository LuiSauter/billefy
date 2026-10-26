using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;

namespace Ledger.Domain.Transactions;

public sealed class Transaction : Entity
{
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
        DateTime createdAt)
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
        DateTime? createdAt = null)
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
            createdAt: createdAt ?? DateTime.UtcNow);
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
            createdAt: createdAt ?? DateTime.UtcNow);
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
        DateTime? createdAt = null)
    {
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
