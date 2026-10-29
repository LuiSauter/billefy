using Api.Common;
using Ingestion.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class BinanceEndpoints
{
    public static RouteGroupBuilder MapBinanceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/integrations/binance")
            .WithTags("Binance")
            .RequireAuthorization();

        group.MapPost("/connect", async (
            [FromBody] ConnectBinanceKeyRequest request,
            IBinanceSyncService service,
            CancellationToken ct) =>
        {
            var result = await service.ConnectKeyAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("ConnectBinanceKey")
        .WithSummary("Connect a read-only Binance API key. Rejects keys with trading or withdrawal permissions (Rule 18, ING-14).")
        .Produces<ConnectBinanceKeyResponse>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/sync", async (
            [FromBody] SyncBinanceRequest request,
            IBinanceSyncService service,
            CancellationToken ct) =>
        {
            var result = await service.SyncAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("SyncBinanceOrders")
        .WithSummary("Sync completed P2P orders and deposits as drafts with automatic deduplication (ING-15).")
        .Produces<SyncBinanceResponse>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }
}
