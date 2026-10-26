using BuildingBlocks.Security;
using Ingestion.Application.Drafts.ConfirmDraft;
using Ingestion.Application.Drafts.DiscardDraft;
using Ingestion.Application.Drafts.GetDrafts;
using Ingestion.Contracts;
using Ingestion.Domain.Drafts;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class DraftEndpoints
{
    public static RouteGroupBuilder MapDraftEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/drafts")
            .WithTags("Drafts");

        group.MapGet("/", async (
            [FromQuery] string? status,
            [FromQuery] int? limit,
            GetDraftsQueryHandler handler,
            ICurrentUserContext userContext,
            CancellationToken ct) =>
        {
            if (!userContext.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            DraftStatus? draftStatus = null;
            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<DraftStatus>(status, ignoreCase: true, out var parsedStatus))
            {
                draftStatus = parsedStatus;
            }

            var query = new GetDraftsQuery(userContext.UserId!.Value, draftStatus, limit ?? 50);
            var result = await handler.HandleAsync(query, ct);

            if (result.IsFailure)
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: result.Error.Code,
                    detail: result.Error.Description);
            }

            return Results.Ok(result.Value);
        })
        .WithName("GetDrafts")
        .WithSummary("List detected movement drafts awaiting confirmation or review.")
        .Produces<List<DraftDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/{id:guid}/confirm", async (
            [FromRoute] Guid id,
            [FromBody] ConfirmDraftRequest request,
            ConfirmDraftCommandHandler handler,
            ICurrentUserContext userContext,
            CancellationToken ct) =>
        {
            if (!userContext.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var command = new ConfirmDraftCommand(userContext.UserId!.Value, id, request);
            var result = await handler.HandleAsync(command, ct);

            if (result.IsFailure)
            {
                var statusCode = result.Error.Code switch
                {
                    "Draft.NotFound" => StatusCodes.Status404NotFound,
                    "Draft.InvalidState" => StatusCodes.Status409Conflict,
                    _ => StatusCodes.Status400BadRequest
                };

                return Results.Problem(
                    statusCode: statusCode,
                    title: result.Error.Code,
                    detail: result.Error.Description);
            }

            return Results.Ok(new { TransactionId = result.Value });
        })
        .WithName("ConfirmDraft")
        .WithSummary("Confirm a draft, atomically persisting it as an immutable transaction in the Ledger.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/{id:guid}/discard", async (
            [FromRoute] Guid id,
            DiscardDraftCommandHandler handler,
            ICurrentUserContext userContext,
            CancellationToken ct) =>
        {
            if (!userContext.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var command = new DiscardDraftCommand(userContext.UserId!.Value, id);
            var result = await handler.HandleAsync(command, ct);

            if (result.IsFailure)
            {
                var statusCode = result.Error.Code switch
                {
                    "Draft.NotFound" => StatusCodes.Status404NotFound,
                    "Draft.InvalidState" => StatusCodes.Status409Conflict,
                    _ => StatusCodes.Status400BadRequest
                };

                return Results.Problem(
                    statusCode: statusCode,
                    title: result.Error.Code,
                    detail: result.Error.Description);
            }

            return Results.Ok(new { Message = "Draft discarded" });
        })
        .WithName("DiscardDraft")
        .WithSummary("Discard a draft while retaining its fingerprint to prevent duplicate capture.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }
}
