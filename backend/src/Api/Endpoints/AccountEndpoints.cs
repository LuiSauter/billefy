using Api.Common;
using Ledger.Application.Accounts.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class AccountEndpoints
{
    public static RouteGroupBuilder MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/accounts")
            .WithTags("Accounts")
            .RequireAuthorization();

        group.MapPost("/", async (
            [FromBody] CreateAccountRequest request,
            IAccountService service,
            CancellationToken ct) =>
        {
            var result = await service.CreateAccountAsync(request, ct);
            return result.ToHttpResult(id => Results.Created($"/v1/accounts/{id}", new { id }));
        })
        .WithName("CreateAccount")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/", async (
            IAccountService service,
            CancellationToken ct) =>
        {
            var result = await service.GetAccountsAsync(ct);
            return result.ToHttpResult();
        })
        .WithName("GetAccounts")
        .Produces<List<AccountDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPut("/{id:guid}", async (
            [FromRoute] Guid id,
            [FromBody] UpdateAccountRequest request,
            IAccountService service,
            CancellationToken ct) =>
        {
            var result = await service.UpdateAccountAsync(id, request, ct);
            return result.ToHttpResult(() => Results.NoContent());
        })
        .WithName("UpdateAccount")
        .WithSummary("Rename an account and change its icon and color. Balance and currency are never modified.")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapDelete("/{id:guid}", async (
            [FromRoute] Guid id,
            IAccountService service,
            CancellationToken ct) =>
        {
            var result = await service.DeleteAccountAsync(id, ct);
            return result.ToHttpResult(() => Results.NoContent());
        })
        .WithName("DeleteAccount")
        .WithSummary("Delete an account if it has no transactions, or archive it if it has transaction history (ACC-05).")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/reconcile", async (
            [FromRoute] Guid id,
            [FromBody] ReconcileAccountRequest request,
            IAccountService service,
            CancellationToken ct) =>
        {
            var result = await service.ReconcileAccountAsync(id, request, ct);
            return result.ToHttpResult();
        })
        .WithName("ReconcileAccount")
        .WithSummary("Reconcile an account balance by registering an adjustment transaction for any discrepancy (ACC-06).")
        .Produces<ReconciliationResult>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }
}
