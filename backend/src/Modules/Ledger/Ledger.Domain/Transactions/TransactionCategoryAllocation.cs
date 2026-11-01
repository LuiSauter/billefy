using BuildingBlocks.Common;

namespace Ledger.Domain.Transactions;

public sealed record TransactionCategoryAllocationInput(Guid CategoryId, decimal Amount);

public sealed class TransactionCategoryAllocation : Entity
{
    public Guid TransactionId { get; private set; }
    public Guid CategoryId { get; private set; }
    public decimal Amount { get; private set; }

    private TransactionCategoryAllocation() : base() { }

    private TransactionCategoryAllocation(Guid id, Guid ownerId, Guid transactionId, Guid categoryId, decimal amount, DateTime createdAt)
        : base(id, ownerId, createdAt)
    {
        if (transactionId == Guid.Empty) throw new ArgumentException("TransactionId cannot be empty.", nameof(transactionId));
        if (categoryId == Guid.Empty) throw new ArgumentException("CategoryId cannot be empty.", nameof(categoryId));
        if (amount <= 0m) throw new ArgumentOutOfRangeException(nameof(amount), "Allocation amount must be strictly positive.");
        if (decimal.Round(amount, 6) != amount || amount >= 100000000000000m)
            throw new ArgumentOutOfRangeException(nameof(amount), "Allocation amount must fit numeric(20,6).");

        TransactionId = transactionId;
        CategoryId = categoryId;
        Amount = amount;
    }

    public static TransactionCategoryAllocation Create(Guid ownerId, Guid transactionId, Guid categoryId, decimal amount, DateTime? createdAt = null) =>
        new(Guid.NewGuid(), ownerId, transactionId, categoryId, amount, createdAt ?? DateTime.UtcNow);
}
