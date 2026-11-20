using BuildingBlocks.Common;
using BuildingBlocks.Security;
using Ingestion.Application.Events.RegisterEvent;
using Ingestion.Contracts;

namespace Ingestion.Application.Services;

public sealed class IngestionService(
    RegisterEventCommandHandler handler,
    ICurrentUserContext userContext) : IIngestionService
{
    public Task<Result<RegisterEventResponse>> IngestEventAsync(
        Guid? idempotencyKey,
        CreateRawEventRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Task.FromResult(Result.Failure<RegisterEventResponse>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.")));
        }

        var eventId = idempotencyKey.HasValue && idempotencyKey.Value != Guid.Empty
            ? idempotencyKey.Value
            : request.EventId;

        if (eventId == Guid.Empty)
        {
            return Task.FromResult(Result.Failure<RegisterEventResponse>(
                Error.Validation("Event.InvalidId", "EventId or Idempotency-Key is required.")));
        }

        var command = new RegisterEventCommand(
            userContext.UserId!.Value,
            request with { EventId = eventId });

        return handler.HandleAsync(command, cancellationToken);
    }
}
