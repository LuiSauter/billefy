using BuildingBlocks.Common;
using BuildingBlocks.Security;
using Ingestion.Application.Drafts.ConfirmDraft;
using Ingestion.Application.Drafts.DiscardDraft;
using Ingestion.Application.Drafts.GetDrafts;
using Ingestion.Contracts;
using Ingestion.Domain.Drafts;

namespace Ingestion.Application.Services;

public sealed class DraftService(
    GetDraftsQueryHandler getDraftsHandler,
    ConfirmDraftCommandHandler confirmDraftHandler,
    DiscardDraftCommandHandler discardDraftHandler,
    ICurrentUserContext userContext) : IDraftService
{
    public Task<Result<List<DraftDto>>> GetDraftsAsync(
        string? status = null,
        int limit = 50,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Task.FromResult(Result.Failure<List<DraftDto>>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.")));
        }

        DraftStatus? draftStatus = null;
        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<DraftStatus>(status, ignoreCase: true, out var parsedStatus))
        {
            draftStatus = parsedStatus;
        }

        var query = new GetDraftsQuery(userContext.UserId!.Value, draftStatus, limit);
        return getDraftsHandler.HandleAsync(query, cancellationToken);
    }

    public Task<Result<Guid>> ConfirmDraftAsync(
        Guid draftId,
        ConfirmDraftRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Task.FromResult(Result.Failure<Guid>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.")));
        }

        return ConfirmDraftForUserAsync(userContext.UserId!.Value, draftId, request, cancellationToken);
    }

    public Task<Result<Guid>> ConfirmDraftForUserAsync(
        Guid userId,
        Guid draftId,
        ConfirmDraftRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new ConfirmDraftCommand(userId, draftId, request);
        return confirmDraftHandler.HandleAsync(command, cancellationToken);
    }

    public Task<Result> DiscardDraftAsync(
        Guid draftId,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Task.FromResult(Result.Failure(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.")));
        }

        return DiscardDraftForUserAsync(userContext.UserId!.Value, draftId, cancellationToken);
    }

    public Task<Result> DiscardDraftForUserAsync(
        Guid userId,
        Guid draftId,
        CancellationToken cancellationToken = default)
    {
        var command = new DiscardDraftCommand(userId, draftId);
        return discardDraftHandler.HandleAsync(command, cancellationToken);
    }
}
