using BuildingBlocks.Common;

namespace Lending.Domain.Entities;

// Append-only recognition event, paired atomically with its ledger expense and
// a new original principal obligation. Never rewrite the opening principal.
public sealed class LoanPurchase : Entity
{
    public Guid LoanId { get; private init; }
    public Guid InstallmentId { get; private init; }
    public Guid LedgerTransactionId { get; private init; }
    public decimal Amount { get; private init; }
    public DateTime OccurredAt { get; private init; }
    public Guid? CategoryId { get; private init; }
    public string? Description { get; private init; }
    public Guid? IdempotencyKey { get; private init; }
    public string Fingerprint { get; private init; } = "";
    private LoanPurchase() { }
    public LoanPurchase(Guid userId, Guid loanId, Guid installmentId, Guid ledgerTransactionId, decimal amount,
        DateTime occurredAt, Guid? categoryId, string? description, Guid? key, string fingerprint, DateTime createdAt)
        : base(Guid.NewGuid(), userId, createdAt)
    {
        if (amount <= 0m || loanId == Guid.Empty || installmentId == Guid.Empty || ledgerTransactionId == Guid.Empty)
            throw new ArgumentException("A purchase requires positive principal and authoritative links.");
        LoanId = loanId; InstallmentId = installmentId; LedgerTransactionId = ledgerTransactionId;
        Amount = amount; OccurredAt = occurredAt; CategoryId = categoryId; Description = description?.Trim();
        IdempotencyKey = key; Fingerprint = fingerprint;
    }
}
