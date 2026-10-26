using BuildingBlocks.Common;
using Ingestion.Application.Abstractions;
using Ingestion.Contracts;
using Ledger.Contracts;

namespace Ingestion.Application.Drafts.ConfirmDraft;

public sealed record ConfirmDraftCommand(
    Guid UserId,
    Guid DraftId,
    ConfirmDraftRequest Request);

public sealed class ConfirmDraftCommandHandler(
    IDraftRepository draftRepository,
    ILedgerModule ledgerModule,
    IIngestionUnitOfWork unitOfWork)
{
    public async Task<Result<Guid>> HandleAsync(
        ConfirmDraftCommand command,
        CancellationToken cancellationToken = default)
    {
        var (userId, draftId, request) = (command.UserId, command.DraftId, command.Request);

        if (userId == Guid.Empty)
        {
            return Result.Failure<Guid>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (request.AccountId == Guid.Empty)
        {
            return Result.Failure<Guid>(
                Error.Validation("Draft.InvalidAccount", "AccountId is required to confirm a draft."));
        }

        var draft = await draftRepository.GetByIdAsync(draftId, cancellationToken);
        if (draft is null || draft.UserId != userId)
        {
            return Result.Failure<Guid>(
                Error.NotFound("Draft.NotFound", $"Draft {draftId} was not found."));
        }

        try
        {
            // 1. Dispatch transaction to Ledger module
            var ledgerDto = new CreateTransactionFromDraftDto(
                userId,
                request.AccountId,
                draft.Amount.Amount,
                draft.Amount.Currency.Code,
                draft.Direction.ToString(),
                request.CategoryId ?? draft.SuggestedCategoryId,
                draft.EstimatedDate.UtcDateTime,
                request.Description,
                draft.Id,
                draft.Reference);

            var txnId = await ledgerModule.CreateTransactionFromDraftAsync(ledgerDto, cancellationToken);

            // 2. Mark draft as confirmed
            draft.Confirm(
                request.AccountId,
                request.CategoryId ?? draft.SuggestedCategoryId,
                txnId,
                DateTimeOffset.UtcNow);

            await draftRepository.UpdateAsync(draft, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success(txnId);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure<Guid>(Error.Conflict("Draft.InvalidState", ex.Message));
        }
    }
}
