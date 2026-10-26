using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Ingestion.Application.Abstractions;
using Ingestion.Application.Deduplication;
using Ingestion.Application.Parsing;
using Ingestion.Contracts;
using Ingestion.Domain.Drafts;
using Ingestion.Domain.RawEvents;

namespace Ingestion.Application.Events.RegisterEvent;

public sealed record RegisterEventCommand(
    Guid UserId,
    CreateRawEventRequest Request);

public sealed class RegisterEventCommandHandler(
    IRawEventRepository rawEventRepository,
    IDraftRepository draftRepository,
    IFinancialTextParser parser,
    IDeduplicationService deduplicationService,
    IIngestionUnitOfWork unitOfWork)
{
    public async Task<Result<RegisterEventResponse>> HandleAsync(
        RegisterEventCommand command,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var (userId, request) = (command.UserId, command.Request);

            if (userId == Guid.Empty)
            {
                return Result.Failure<RegisterEventResponse>(
                    Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
            }

            if (request.EventId == Guid.Empty)
            {
                return Result.Failure<RegisterEventResponse>(
                    Error.Validation("Event.InvalidId", "EventId is required."));
            }

            // 1. Technical Idempotency Check on (user_id, event_id)
            var existingEvent = await rawEventRepository.GetByEventIdAsync(userId, request.EventId, cancellationToken);
            if (existingEvent is not null)
            {
                // Already received and processed
                return Result.Success(new RegisterEventResponse(
                    request.EventId,
                    IsNewEvent: false,
                    DraftId: null,
                    IsDuplicate: false,
                    Status: "AlreadyProcessed"));
            }

            // 2. Persist Raw Event
            var receivedAt = request.ReceivedAt ?? DateTime.UtcNow;
            var rawEvent = RawEvent.Create(
                userId,
                request.EventId,
                request.Channel,
                request.SourceId,
                request.MaskedText,
                receivedAt);

            await rawEventRepository.AddAsync(rawEvent, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            // 3. Parse Financial Movement
            if (string.IsNullOrWhiteSpace(request.MaskedText))
            {
                return Result.Success(new RegisterEventResponse(
                    request.EventId,
                    IsNewEvent: true,
                    DraftId: null,
                    IsDuplicate: false,
                    Status: "NoText"));
            }

            var parseResult = parser.Parse(request.MaskedText, receivedAt);
            if (parseResult.Success)
            {
                // 4. Deduplicate and create or link draft
                var dedupResult = await deduplicationService.ProcessMovementAsync(
                    userId,
                    request.EventId,
                    request.Channel,
                    parseResult.Amount,
                    parseResult.Currency,
                    parseResult.Direction,
                    receivedAt,
                    parseResult.Reference,
                    parseResult.Confidence,
                    cancellationToken: cancellationToken);

                return Result.Success(new RegisterEventResponse(
                    request.EventId,
                    IsNewEvent: true,
                    DraftId: dedupResult.DraftId,
                    IsDuplicate: dedupResult.IsDuplicate,
                    Status: dedupResult.Status.ToString()));
            }

            // Low confidence / Unparseable financial text -> Create Review Draft
            var fallbackMoney = Money.Of(1m, Currency.USD);
            var reviewDraft = Draft.CreateReview(
                userId,
                request.Channel,
                DraftDirection.Expense,
                fallbackMoney,
                receivedAt,
                reference: null,
                suggestedAccountId: null,
                suggestedCategoryId: null,
                confidence: 0.10m,
                initialEventId: request.EventId,
                createdAt: DateTime.UtcNow);

            await draftRepository.AddAsync(reviewDraft, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success(new RegisterEventResponse(
                request.EventId,
                IsNewEvent: true,
                DraftId: reviewDraft.Id,
                IsDuplicate: false,
                Status: DraftStatus.Review.ToString()));
        }
        catch (Exception ex)
        {
            return Result.Failure<RegisterEventResponse>(
                Error.Failure("Server.Exception", ex.ToString()));
        }
    }
}
