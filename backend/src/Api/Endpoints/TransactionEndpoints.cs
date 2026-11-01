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
            .WithTags("Transactions")
            .RequireAuthorization();

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

        group.MapGet("/movements", async (
            [FromQuery] DateTime? startUtc,
            [FromQuery] DateTime? endUtcExclusive,
            [FromQuery] Guid? accountId,
            [FromQuery] Guid? categoryId,
            [FromQuery] MovementKind? type,
            [FromQuery] string? search,
            [FromQuery] MovementHistoryMode? mode,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            ITransactionService service,
            CancellationToken ct) =>
        {
            var result = await service.GetMovementsAsync(new MovementQuery(startUtc, endUtcExclusive, accountId,
                categoryId, type, search, mode ?? MovementHistoryMode.Active, page ?? 1, pageSize ?? 50), ct);
            return result.ToHttpResult();
        })
        .WithName("GetMovements")
        .Produces<MovementPage>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
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

        group.MapPut("/transfers/{id:guid}", async (
            [FromRoute] Guid id,
            [FromBody] CorrectTransferRequest request,
            ITransactionService service,
            CancellationToken ct) =>
        {
            var result = await service.CorrectTransferAsync(id, request, ct);
            return result.ToHttpResult(pair => Results.Ok(new { outflowId = pair.OutflowId, inflowId = pair.InflowId, replacedTransferId = id }));
        })
        .WithName("CorrectTransfer")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

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
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}", async (
            [FromRoute] Guid id,
            [FromBody] UpdateTransactionRequest request,
            ITransactionService service,
            CancellationToken ct) =>
        {
            var result = await service.UpdateTransactionAsync(id, request, ct);
            return result.ToHttpResult(newId => Results.Ok(new { id = newId, replacedTransactionId = id }));
        })
        .WithName("UpdateTransaction")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", async (
            [FromRoute] Guid id,
            ITransactionService service,
            CancellationToken ct) =>
        {
            var result = await service.ReverseTransactionAsync(id, "Deleted by user", ct);
            return result.ToHttpResult(res => Results.Ok(new { id = res.Id, reversedTransactionId = res.ReversedTransactionId }));
        })
        .WithName("DeleteTransaction")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }
}
