using BuildingBlocks.Common;
using Ingestion.Contracts;

namespace Ingestion.Application.Services;

public interface IDraftService
{
    Task<Result<List<DraftDto>>> GetDraftsAsync(
        string? status = null,
        int limit = 50,
        CancellationToken cancellationToken = default);

    Task<Result<Guid>> ConfirmDraftAsync(
        Guid draftId,
        ConfirmDraftRequest request,
        CancellationToken cancellationToken = default);

    Task<Result> DiscardDraftAsync(
        Guid draftId,
        CancellationToken cancellationToken = default);
}
