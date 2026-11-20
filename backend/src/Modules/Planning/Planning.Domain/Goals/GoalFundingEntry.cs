using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;

namespace Planning.Domain.Goals;

// Append-only earmarking, never a cash transaction or an additional asset.
public sealed class GoalFundingEntry : Entity
{
    public Guid GoalId { get; private set; }
    public Guid AccountId { get; private set; }
    public Guid IdempotencyKey { get; private set; }
    public decimal SignedAmount { get; private set; }
    public string Currency { get; private set; } = string.Empty;
    public DateTime OccurredAt { get; private set; }
    public bool ExplicitDate { get; private set; }

    private GoalFundingEntry() { }

    public GoalFundingEntry(Guid userId, Guid goalId, Guid accountId, Guid key, Money amount,
        bool release, DateTime occurredAt, bool explicitDate, DateTime createdAt) : base(Guid.NewGuid(), userId, createdAt)
    {
        if (amount.Amount <= 0 || key == Guid.Empty)
            throw new ArgumentException("Funding entries require positive money and a nonempty idempotency key.");
        GoalId = goalId;
        AccountId = accountId;
        IdempotencyKey = key;
        SignedAmount = release ? -amount.Amount : amount.Amount;
        Currency = amount.Currency.Code;
        OccurredAt = occurredAt;
        ExplicitDate = explicitDate;
    }
}

// Only a serialization token. All monetary totals are derived from entries.
public sealed class GoalFundingAccount
{
    public Guid UserId { get; private set; }
    public Guid AccountId { get; private set; }
    public long Revision { get; private set; }
    private GoalFundingAccount() { }
    public GoalFundingAccount(Guid userId, Guid accountId) { UserId = userId; AccountId = accountId; }
    public void Advance() => Revision = checked(Revision + 1);
}
