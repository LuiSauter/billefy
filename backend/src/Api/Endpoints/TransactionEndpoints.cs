using Api.Common;
using Ledger.Application.Transactions.Services;
using Ledger.Domain.Transactions;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class TransactionEndpoints
{
    public static RouteGroupBuilder MapTransactionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/transactions")
            .WithTags("Transactions");

        group.MapGet("/", async (
            [FromQuery] Guid? accountId,
            [FromQuery] TransactionDirection? direction,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int? limit,
            ITransactionService service,
            CancellationToken ct) =>
        {
            var result = await service.GetTransactionsAsync(accountId, direction, from, to, limit ?? 50, ct);
            return result.ToHttpResult();
        })
        .WithName("GetTransactions")
        .Produces<List<TransactionDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/", async (
            [FromBody] RegisterTransactionRequest request,
            ITransactionService service,
            CancellationToken ct) =>
        {
            var result = await service.RegisterTransactionAsync(request, ct);
            return result.ToHttpResult(id => Results.Created($"/v1/transactions/{id}", new { id }));
        })
        .WithName("RegisterTransaction")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/transfers", async (
            [FromBody] RegisterTransferRequest request,
            ITransactionService service,
            CancellationToken ct) =>
        {
            var result = await service.RegisterTransferAsync(request, ct);
            return result.ToHttpResult(pair => Results.Created(
                $"/v1/transactions/{pair.OutflowId}",
                new { outflowId = pair.OutflowId, inflowId = pair.InflowId }));
        })
        .WithName("RegisterTransfer")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/{id:guid}/reverse", async (
            [FromRoute] Guid id,
            [FromBody] ReverseTransactionRequest? request,
            ITransactionService service,
            CancellationToken ct) =>
        {
            var result = await service.ReverseTransactionAsync(id, request?.Reason, ct);
            return result.ToHttpResult(res => Results.Ok(new { id = res.Id, reversedTransactionId = res.ReversedTransactionId }));
        })
        .WithName("ReverseTransaction")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }
}
