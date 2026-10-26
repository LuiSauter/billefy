using BuildingBlocks.Common;
using Ingestion.Application.Abstractions;

namespace Ingestion.Application.Drafts.DiscardDraft;

public sealed record DiscardDraftCommand(Guid UserId, Guid DraftId);

public sealed class DiscardDraftCommandHandler(
    IDraftRepository draftRepository,
    IIngestionUnitOfWork unitOfWork)
{
    public async Task<Result> HandleAsync(
        DiscardDraftCommand command,
        CancellationToken cancellationToken = default)
    {
        var (userId, draftId) = (command.UserId, command.DraftId);

        if (userId == Guid.Empty)
        {
            return Result.Failure(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var draft = await draftRepository.GetByIdAsync(draftId, cancellationToken);
        if (draft is null || draft.UserId != userId)
        {
            return Result.Failure(
                Error.NotFound("Draft.NotFound", $"Draft {draftId} was not found."));
        }

        try
        {
            draft.Discard(DateTimeOffset.UtcNow);
            await draftRepository.UpdateAsync(draft, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure(Error.Conflict("Draft.InvalidState", ex.Message));
        }
    }
}
