using BuildingBlocks.Security;
using Ingestion.Application.Events.RegisterEvent;
using Ingestion.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class IngestionEndpoints
{
    public static RouteGroupBuilder MapIngestionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/ingestion")
            .WithTags("Ingestion");

        group.MapPost("/events", async (
            [FromHeader(Name = "Idempotency-Key")] Guid? idempotencyKey,
            [FromBody] CreateRawEventRequest request,
            RegisterEventCommandHandler handler,
            ICurrentUserContext userContext,
            CancellationToken ct) =>
        {
            if (!userContext.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var eventId = idempotencyKey.HasValue && idempotencyKey.Value != Guid.Empty
                ? idempotencyKey.Value
                : request.EventId;

            if (eventId == Guid.Empty)
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Validation Error",
                    detail: "EventId or Idempotency-Key is required.");
            }

            var command = new RegisterEventCommand(
                userContext.UserId!.Value,
                request with { EventId = eventId });

            var result = await handler.HandleAsync(command, ct);

            if (result.IsFailure)
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: result.Error.Code,
                    detail: result.Error.Description);
            }

            var response = result.Value;

            // Section 7.1: Conflict/Retry returns 200 OK; New event returns 202 Accepted
            return response.IsNewEvent
                ? Results.Accepted($"/v1/ingestion/events/{response.EventId}", response)
                : Results.Ok(response);
        })
        .WithName("RegisterRawEvent")
        .WithSummary("Idempotently ingest a financial raw event (notification, whatsapp, csv).")
        .Produces<RegisterEventResponse>(StatusCodes.Status202Accepted)
        .Produces<RegisterEventResponse>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }
}
