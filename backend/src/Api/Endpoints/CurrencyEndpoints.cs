using Fx.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class CurrencyEndpoints
{
    public static IEndpointRouteBuilder MapCurrencyEndpoints(this IEndpointRouteBuilder app)
    {
        var handler = async (
                [FromServices] ICurrencyCatalog catalog,
                CancellationToken cancellationToken) =>
            Results.Ok(await catalog.GetActiveCurrenciesAsync(cancellationToken));

        app.MapGet("/v1/currencies", handler)
            .WithTags("Currencies")
            .WithSummary("Returns globally supported currencies")
            .AllowAnonymous();

        app.MapGet("/api/v1/currencies", handler)
            .WithTags("Currencies")
            .WithSummary("Returns globally supported currencies")
            .AllowAnonymous();

        return app;
    }
}
