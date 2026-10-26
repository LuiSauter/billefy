using BuildingBlocks.Common;
using Ingestion.Application.Abstractions;
using Ingestion.Contracts;
using Ingestion.Domain.Drafts;

namespace Ingestion.Application.Drafts.GetDrafts;

public sealed record GetDraftsQuery(
    Guid UserId,
    DraftStatus? Status = null,
    int Limit = 50);

public sealed class GetDraftsQueryHandler(IDraftRepository draftRepository)
{
    public async Task<Result<List<DraftDto>>> HandleAsync(
        GetDraftsQuery query,
        CancellationToken cancellationToken = default)
    {
        if (query.UserId == Guid.Empty)
        {
            return Result.Failure<List<DraftDto>>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var drafts = await draftRepository.GetByUserIdAsync(
            query.UserId,
            query.Status,
            query.Limit,
            cancellationToken);

        var dtos = drafts.Select(d => new DraftDto(
            d.Id,
            d.Source,
            d.Status.ToString(),
            d.Direction.ToString(),
            d.Amount.Amount,
            d.Amount.Currency.Code,
            d.EstimatedDate,
            d.Reference,
            d.Fingerprint,
            d.Confidence,
            d.SuggestedAccountId,
            d.SuggestedCategoryId,
            d.ConfirmedAccountId,
            d.ConfirmedCategoryId,
            d.LedgerTransactionId,
            new DateTimeOffset(d.CreatedAt, TimeSpan.Zero),
            d.ConfirmedAt,
            d.DiscardedAt,
            d.Events.Count)).ToList();

        return Result.Success(dtos);
    }
}
