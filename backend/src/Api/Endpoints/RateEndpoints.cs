using BuildingBlocks.Security;
using Fx.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class RateEndpoints
{
    public static RouteGroupBuilder MapRateEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/rates")
            .WithTags("Rates");

        group.MapGet("/latest", async (
            [FromQuery] string currency,
            [FromQuery] string? baseCurrency,
            IRateSnapshotProvider rateProvider,
            ICurrentUserContext userContext,
            CancellationToken ct) =>
        {
            var baseCode = baseCurrency ?? "USD";
            var snapshot = await rateProvider.GetSnapshotAsync(currency, baseCode, userContext.UserId, ct);

            if (snapshot is null)
            {
                return Results.NotFound(new { message = $"No rate available for pair {currency}/{baseCode}." });
            }

            return Results.Ok(snapshot);
        })
        .WithName("GetLatestRate")
        .Produces<RateSnapshotDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        return group;
    }
}
