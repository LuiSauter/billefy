using BuildingBlocks.Common;

namespace Ingestion.Contracts;

public sealed record ParsedMovementDto(
    bool Success,
    decimal Amount,
    string Currency,
    string Direction,
    string? Reference,
    decimal Confidence,
    Guid? DraftId = null,
    bool IsDuplicate = false);

public interface IIngestionModule
{
    Task<ParsedMovementDto> ParseAndProcessTextMovementAsync(
        Guid userId,
        string source,
        string rawText,
        DateTime receivedAt,
        CancellationToken cancellationToken = default);

    Task<Result<Guid>> ConfirmDraftForUserAsync(
        Guid userId,
        Guid draftId,
        ConfirmDraftRequest request,
        CancellationToken cancellationToken = default);

    Task<Result> DiscardDraftForUserAsync(
        Guid userId,
        Guid draftId,
        CancellationToken cancellationToken = default);
}
