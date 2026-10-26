using Api.Common;
using Ingestion.Application.Services;
using Ingestion.Contracts;
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
            IDraftService service,
            CancellationToken ct) =>
        {
            var result = await service.GetDraftsAsync(status, limit ?? 50, ct);
            return result.ToHttpResult();
        })
        .WithName("GetDrafts")
        .WithSummary("List detected movement drafts awaiting confirmation or review.")
        .Produces<List<DraftDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/{id:guid}/confirm", async (
            [FromRoute] Guid id,
            [FromBody] ConfirmDraftRequest request,
            IDraftService service,
            CancellationToken ct) =>
        {
            var result = await service.ConfirmDraftAsync(id, request, ct);
            return result.ToHttpResult(txnId => Results.Ok(new { TransactionId = txnId }));
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
            IDraftService service,
            CancellationToken ct) =>
        {
            var result = await service.DiscardDraftAsync(id, ct);
            return result.ToHttpResult(() => Results.Ok(new { Message = "Draft discarded" }));
        })
        .WithName("DiscardDraft")
        .WithSummary("Discard a draft while retaining its fingerprint to prevent duplicate capture.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }
}
