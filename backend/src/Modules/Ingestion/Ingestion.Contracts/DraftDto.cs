namespace Ingestion.Contracts;

public sealed record DraftDto(
    Guid Id,
    string Source,
    string Status,
    string Direction,
    decimal Amount,
    string Currency,
    DateTime EstimatedDate,
    string? Reference,
    string Fingerprint,
    decimal Confidence,
    Guid? SuggestedAccountId,
    Guid? SuggestedCategoryId,
    Guid? ConfirmedAccountId,
    Guid? ConfirmedCategoryId,
    Guid? LedgerTransactionId,
    DateTime CreatedAt,
    DateTime? ConfirmedAt,
    DateTime? DiscardedAt,
    int LinkedEventsCount);

public sealed record CreateRawEventRequest(
    Guid EventId,
    string Channel,
    string? SourceId,
    string? MaskedText,
    DateTime? ReceivedAt = null);

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
