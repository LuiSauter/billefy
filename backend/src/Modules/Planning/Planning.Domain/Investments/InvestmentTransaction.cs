using BuildingBlocks.Common;

namespace Planning.Domain.Investments;

public enum InvestmentTransactionType
{
    Buy,
    Sell,
    Dividend,
    Fee,
    Revaluation
}

public sealed class InvestmentTransaction : Entity
{
    public Guid InvestmentId { get; private set; }
    public InvestmentTransactionType Type { get; private set; }
    public decimal Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal TotalAmount { get; private set; }
    public decimal Fees { get; private set; }
    public DateTime OccurredAt { get; private set; }
    public string? Notes { get; private set; }
    public Guid? LedgerTransactionId { get; private set; }

    private InvestmentTransaction() : base() { }

    private InvestmentTransaction(
        Guid userId,
        Guid investmentId,
        InvestmentTransactionType type,
        decimal quantity,
        decimal unitPrice,
        decimal totalAmount,
        decimal fees,
        DateTime occurredAt,
        string? notes,
        Guid? ledgerTransactionId,
        DateTime createdAt)
        : base(Guid.NewGuid(), userId, createdAt)
    {
        if (investmentId == Guid.Empty)
            throw new ArgumentException("InvestmentId cannot be empty.", nameof(investmentId));
        if (totalAmount < decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(totalAmount), "Total amount cannot be negative.");
        if (fees < decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(fees), "Fees cannot be negative.");

        InvestmentId = investmentId;
        Type = type;
        Quantity = quantity;
        UnitPrice = unitPrice;
        TotalAmount = totalAmount;
        Fees = fees;
        OccurredAt = occurredAt;
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        LedgerTransactionId = ledgerTransactionId;
    }

    public static InvestmentTransaction Create(
        Guid userId,
        Guid investmentId,
        InvestmentTransactionType type,
        decimal quantity,
        decimal unitPrice,
        decimal totalAmount,
        decimal fees,
        DateTime occurredAt,
        string? notes = null,
        Guid? ledgerTransactionId = null,
        DateTime? createdAt = null) =>
        new(
            userId,
            investmentId,
            type,
            quantity,
            unitPrice,
            totalAmount,
            fees,
            occurredAt,
            notes,
            ledgerTransactionId,
            createdAt ?? DateTime.UtcNow);

    public void LinkLedgerTransaction(Guid transactionId)
    {
        if (transactionId == Guid.Empty)
            throw new ArgumentException("TransactionId cannot be empty.", nameof(transactionId));
        LedgerTransactionId = transactionId;
    }
}
