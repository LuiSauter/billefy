using Ledger.Application.Transactions.RegisterTransaction;
using Ledger.Application.Transactions.RegisterTransfer;
using Ledger.Application.Transactions.ReverseTransaction;
using Ledger.Domain.Transactions;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class TransactionEndpoints
{
    public static RouteGroupBuilder MapTransactionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/transactions")
            .WithTags("Transactions");

        group.MapPost("/", async (
            [FromBody] RegisterTransactionRequest request,
            RegisterTransactionCommandHandler handler,
            CancellationToken ct) =>
        {
            var command = new RegisterTransactionCommand(
                request.AccountId,
                request.Amount,
                request.Direction,
                request.CategoryId,
                request.OccurredAt ?? DateTime.UtcNow,
                request.Description,
                request.AppliedRate,
                request.RateSource);

            var result = await handler.HandleAsync(command, ct);

            return result.Match(
                id => Results.Created($"/v1/transactions/{id}", new { id }),
                error => Results.Problem(
                    detail: error.Description,
                    title: error.Code,
                    statusCode: error.Type switch
                    {
                        BuildingBlocks.Common.ErrorType.Validation => StatusCodes.Status400BadRequest,
                        BuildingBlocks.Common.ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
                        BuildingBlocks.Common.ErrorType.NotFound => StatusCodes.Status404NotFound,
                        BuildingBlocks.Common.ErrorType.Conflict => StatusCodes.Status409Conflict,
                        _ => StatusCodes.Status500InternalServerError
                    }));
        })
        .WithName("RegisterTransaction")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/transfers", async (
            [FromBody] RegisterTransferRequest request,
            RegisterTransferCommandHandler handler,
            CancellationToken ct) =>
        {
            var command = new RegisterTransferCommand(
                request.SourceAccountId,
                request.SourceAmount,
                request.DestinationAccountId,
                request.DestinationAmount,
                request.OccurredAt ?? DateTime.UtcNow,
                request.AppliedRate,
                request.RateSource,
                request.Description);

            var result = await handler.HandleAsync(command, ct);

            return result.Match(
                pair => Results.Created($"/v1/transactions/{pair.OutflowId}", new { outflowId = pair.OutflowId, inflowId = pair.InflowId }),
                error => Results.Problem(
                    detail: error.Description,
                    title: error.Code,
                    statusCode: error.Type switch
                    {
                        BuildingBlocks.Common.ErrorType.Validation => StatusCodes.Status400BadRequest,
                        BuildingBlocks.Common.ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
                        BuildingBlocks.Common.ErrorType.NotFound => StatusCodes.Status404NotFound,
                        BuildingBlocks.Common.ErrorType.Conflict => StatusCodes.Status409Conflict,
                        _ => StatusCodes.Status500InternalServerError
                    }));
        })
        .WithName("RegisterTransfer")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapPost("/{id:guid}/reverse", async (
            Guid id,
            [FromBody] ReverseTransactionRequest? request,
            ReverseTransactionCommandHandler handler,
            CancellationToken ct) =>
        {
            var command = new ReverseTransactionCommand(id, request?.Reason);
            var result = await handler.HandleAsync(command, ct);

            return result.Match(
                reversalId => Results.Ok(new { id = reversalId, reversedTransactionId = id }),
                error => Results.Problem(
                    detail: error.Description,
                    title: error.Code,
                    statusCode: error.Type switch
                    {
                        BuildingBlocks.Common.ErrorType.Validation => StatusCodes.Status400BadRequest,
                        BuildingBlocks.Common.ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
                        BuildingBlocks.Common.ErrorType.NotFound => StatusCodes.Status404NotFound,
                        _ => StatusCodes.Status500InternalServerError
                    }));
        })
        .WithName("ReverseTransaction")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }
}

public sealed record RegisterTransactionRequest(
    Guid AccountId,
    decimal Amount,
    TransactionDirection Direction,
    Guid? CategoryId = null,
    DateTime? OccurredAt = null,
    string? Description = null,
    decimal? AppliedRate = null,
    string? RateSource = null);

public sealed record RegisterTransferRequest(
    Guid SourceAccountId,
    decimal SourceAmount,
    Guid DestinationAccountId,
    decimal DestinationAmount,
    DateTime? OccurredAt = null,
    decimal? AppliedRate = null,
    string? RateSource = null,
    string? Description = null);

public sealed record ReverseTransactionRequest(string? Reason);
