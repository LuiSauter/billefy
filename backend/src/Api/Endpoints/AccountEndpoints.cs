using Api.Common;
using Ledger.Application.Accounts.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class AccountEndpoints
{
    public static RouteGroupBuilder MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/accounts")
            .WithTags("Accounts");

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

        return group;
    }
}
