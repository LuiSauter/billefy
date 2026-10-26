using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using Ledger.Application.Abstractions;
using Ledger.Application.Accounts.CreateAccount;
using Ledger.Domain.Accounts;
using Ledger.Infrastructure;
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
            CreateAccountCommandHandler handler,
            CancellationToken ct) =>
        {
            var command = new CreateAccountCommand(
                request.Name,
                request.Type,
                request.Currency,
                request.InitialBalance);

            var result = await handler.HandleAsync(command, ct);

            return result.Match(
                accountId => Results.Created($"/v1/accounts/{accountId}", new { id = accountId }),
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
        .WithName("CreateAccount")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/", async (
            IAccountRepository repository,
            LedgerDbContext dbContext,
            ICurrentUserContext userContext,
            CancellationToken ct) =>
        {
            if (!userContext.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var accounts = await repository.GetAllAsync(includeArchived: false, ct);
            var responses = new List<AccountDto>();

            foreach (var account in accounts)
            {
                var balance = await dbContext.CalculateAccountBalanceAsync(account.Id, ct);
                responses.Add(new AccountDto(
                    account.Id,
                    account.Name,
                    account.Type.ToString(),
                    account.Currency.Code,
                    balance.Amount,
                    account.CreatedAt));
            }

            return Results.Ok(responses);
        })
        .WithName("GetAccounts")
        .Produces<List<AccountDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        return group;
    }
}

public sealed record CreateAccountRequest(
    string Name,
    AccountType Type,
    string Currency,
    decimal InitialBalance = 0m);

public sealed record AccountDto(
    Guid Id,
    string Name,
    string Type,
    string Currency,
    decimal Balance,
    DateTime CreatedAt);
