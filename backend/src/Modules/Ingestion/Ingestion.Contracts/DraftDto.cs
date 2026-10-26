namespace Ingestion.Contracts;

public sealed record DraftDto(
    Guid Id,
    string Source,
    string Status,
    string Direction,
    decimal Amount,
    string Currency,
    DateTimeOffset EstimatedDate,
    string? Reference,
    string Fingerprint,
    decimal Confidence,
    Guid? SuggestedAccountId,
    Guid? SuggestedCategoryId,
    Guid? ConfirmedAccountId,
    Guid? ConfirmedCategoryId,
    Guid? LedgerTransactionId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ConfirmedAt,
    DateTimeOffset? DiscardedAt,
    int LinkedEventsCount);

public sealed record CreateRawEventRequest(
    Guid EventId,
    string Channel,
    string? SourceId,
    string? MaskedText,
    DateTimeOffset? ReceivedAt = null);

public sealed record RegisterEventResponse(
    Guid EventId,
    bool IsNewEvent,
    Guid? DraftId,
    bool IsDuplicate,
    string Status);

public sealed record ConfirmDraftRequest(
    Guid AccountId,
    Guid? CategoryId = null,
    string? Description = null);
