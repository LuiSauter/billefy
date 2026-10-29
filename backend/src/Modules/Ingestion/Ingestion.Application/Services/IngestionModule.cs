using BuildingBlocks.Common;
using Ingestion.Application.Deduplication;
using Ingestion.Application.Parsing;
using Ingestion.Contracts;

namespace Ingestion.Application.Services;

public sealed class IngestionModule(
    IFinancialTextParser parser,
    IDeduplicationService deduplicationService,
    IDraftService draftService) : IIngestionModule
{
    public async Task<ParsedMovementDto> ParseAndProcessTextMovementAsync(
        Guid userId,
        string source,
        string rawText,
        DateTime receivedAt,
        CancellationToken cancellationToken = default)
    {
        var parseResult = parser.Parse(rawText, receivedAt);
        if (!parseResult.Success)
        {
            return new ParsedMovementDto(
                Success: false,
                Amount: 0m,
                Currency: "BOB",
                Direction: "Expense",
                Reference: null,
                Confidence: 0m);
        }

        var dedupResult = await deduplicationService.ProcessMovementAsync(
            userId,
            Guid.NewGuid(),
            source,
            parseResult.Amount,
            parseResult.Currency,
            parseResult.Direction,
            receivedAt,
            parseResult.Reference,
            parseResult.Confidence,
            cancellationToken: cancellationToken);

        return new ParsedMovementDto(
            Success: true,
            Amount: parseResult.Amount,
            Currency: parseResult.Currency,
            Direction: parseResult.Direction.ToString(),
            Reference: parseResult.Reference,
            Confidence: parseResult.Confidence,
            DraftId: dedupResult.DraftId,
            IsDuplicate: dedupResult.IsDuplicate);
    }

    public Task<Result<Guid>> ConfirmDraftForUserAsync(
        Guid userId,
        Guid draftId,
        ConfirmDraftRequest request,
        CancellationToken cancellationToken = default)
    {
        return draftService.ConfirmDraftForUserAsync(userId, draftId, request, cancellationToken);
    }

    public Task<Result> DiscardDraftForUserAsync(
        Guid userId,
        Guid draftId,
        CancellationToken cancellationToken = default)
    {
        return draftService.DiscardDraftForUserAsync(userId, draftId, cancellationToken);
    }
}
