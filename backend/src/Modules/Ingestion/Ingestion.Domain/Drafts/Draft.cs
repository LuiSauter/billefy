using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Ingestion.Domain.Deduplication;

namespace Ingestion.Domain.Drafts;

public sealed class Draft : Entity
{
    private readonly List<DraftEvent> _events = [];

    public Guid? ImportId { get; private init; }
    public Guid? SuggestedAccountId { get; private set; }
    public Guid? SuggestedCategoryId { get; private set; }
    public Guid? ConfirmedAccountId { get; private set; }
    public Guid? ConfirmedCategoryId { get; private set; }
    public Guid? LedgerTransactionId { get; private set; }
    public DraftStatus Status { get; private set; }
    public string Source { get; private init; }
    public DraftDirection Direction { get; private set; }
    public Money Amount { get; private set; }
    public DateTimeOffset EstimatedDate { get; private set; }
    public string? Reference { get; private set; }
    public string Fingerprint { get; private set; }
    public decimal Confidence { get; private set; }
    public DateTimeOffset? ConfirmedAt { get; private set; }
    public DateTimeOffset? DiscardedAt { get; private set; }

    public IReadOnlyCollection<DraftEvent> Events => _events.AsReadOnly();

    private Draft() : base()
    {
        Source = string.Empty;
        Fingerprint = string.Empty;
        Amount = Money.Zero(Currency.USD);
    }

    private Draft(
        Guid id,
        Guid userId,
        Guid? importId,
        Guid? suggestedAccountId,
        Guid? suggestedCategoryId,
        DraftStatus status,
        string source,
        DraftDirection direction,
        Money amount,
        DateTimeOffset estimatedDate,
        string? reference,
        string fingerprint,
        decimal confidence,
        DateTimeOffset createdAt)
        : base(id, userId, createdAt.UtcDateTime)
    {
        if (amount.Amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Draft amount must be positive.");

        if (confidence < 0 || confidence > 1)
            throw new ArgumentOutOfRangeException(nameof(confidence), "Confidence must be between 0.00 and 1.00.");

        ImportId = importId;
        SuggestedAccountId = suggestedAccountId;
        SuggestedCategoryId = suggestedCategoryId;
        Status = status;
        Source = source;
        Direction = direction;
        Amount = amount;
        EstimatedDate = estimatedDate;
        Reference = reference;
        Fingerprint = fingerprint;
        Confidence = confidence;
    }

    public static Draft CreatePending(
        Guid userId,
        string source,
        DraftDirection direction,
        Money amount,
        DateTimeOffset estimatedDate,
        string? reference,
        Guid? suggestedAccountId,
        Guid? suggestedCategoryId,
        decimal confidence,
        Guid? initialEventId,
        DateTimeOffset createdAt)
    {
        var fingerprint = FingerprintGenerator.Generate(
            userId,
            amount.Amount,
            amount.Currency.Code,
            direction,
            estimatedDate,
            reference);

        var draft = new Draft(
            Guid.NewGuid(),
            userId,
            null,
            suggestedAccountId,
            suggestedCategoryId,
            DraftStatus.Pending,
            source,
            direction,
            amount,
            estimatedDate,
            reference,
            fingerprint,
            confidence,
            createdAt);

        if (initialEventId.HasValue && initialEventId.Value != Guid.Empty)
        {
            draft.LinkAdditionalEvent(initialEventId.Value, createdAt);
        }

        return draft;
    }

    public static Draft CreateReview(
        Guid userId,
        string source,
        DraftDirection direction,
        Money amount,
        DateTimeOffset estimatedDate,
        string? reference,
        Guid? suggestedAccountId,
        Guid? suggestedCategoryId,
        decimal confidence,
        Guid? initialEventId,
        DateTimeOffset createdAt)
    {
        var fingerprint = FingerprintGenerator.Generate(
            userId,
            amount.Amount,
            amount.Currency.Code,
            direction,
            estimatedDate,
            reference);

        var draft = new Draft(
            Guid.NewGuid(),
            userId,
            null,
            suggestedAccountId,
            suggestedCategoryId,
            DraftStatus.Review,
            source,
            direction,
            amount,
            estimatedDate,
            reference,
            fingerprint,
            confidence,
            createdAt);

        if (initialEventId.HasValue && initialEventId.Value != Guid.Empty)
        {
            draft.LinkAdditionalEvent(initialEventId.Value, createdAt);
        }

        return draft;
    }

    public void LinkAdditionalEvent(Guid eventId, DateTimeOffset linkedAt)
    {
        if (eventId == Guid.Empty)
            throw new ArgumentException("EventId cannot be empty.", nameof(eventId));

        if (!_events.Any(e => e.EventId == eventId))
        {
            _events.Add(new DraftEvent(Id, eventId, linkedAt));
        }
    }

    public void Confirm(
        Guid accountId,
        Guid? categoryId,
        Guid ledgerTransactionId,
        DateTimeOffset confirmedAt)
    {
        if (Status == DraftStatus.Confirmed)
            throw new InvalidOperationException("Draft is already confirmed.");

        if (Status == DraftStatus.Discarded)
            throw new InvalidOperationException("Cannot confirm a discarded draft.");

        if (accountId == Guid.Empty)
            throw new ArgumentException("AccountId cannot be empty.", nameof(accountId));

        if (ledgerTransactionId == Guid.Empty)
            throw new ArgumentException("LedgerTransactionId cannot be empty.", nameof(ledgerTransactionId));

        Status = DraftStatus.Confirmed;
        ConfirmedAccountId = accountId;
        ConfirmedCategoryId = categoryId;
        LedgerTransactionId = ledgerTransactionId;
        ConfirmedAt = confirmedAt;
    }

    public void Discard(DateTimeOffset discardedAt)
    {
        if (Status == DraftStatus.Confirmed)
            throw new InvalidOperationException("Cannot discard an already confirmed draft.");

        Status = DraftStatus.Discarded;
        DiscardedAt = discardedAt;
    }

    public void UpdateReviewDetails(
        Money amount,
        DraftDirection direction,
        DateTimeOffset estimatedDate,
        string? reference,
        Guid? suggestedAccountId,
        Guid? suggestedCategoryId)
    {
        if (Status != DraftStatus.Review)
            throw new InvalidOperationException("Only drafts in Review state can have details manually updated.");

        if (amount.Amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Draft amount must be positive.");

        Amount = amount;
        Direction = direction;
        EstimatedDate = estimatedDate;
        Reference = reference;
        SuggestedAccountId = suggestedAccountId;
        SuggestedCategoryId = suggestedCategoryId;
        Fingerprint = FingerprintGenerator.Generate(
            UserId,
            amount.Amount,
            amount.Currency.Code,
            direction,
            estimatedDate,
            reference);
        Status = DraftStatus.Pending;
    }
}
