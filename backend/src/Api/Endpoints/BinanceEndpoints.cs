using Api.Common;
using BuildingBlocks.Common;
using Ingestion.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Planning.Application.Services;
using Planning.Contracts;

namespace Api.Endpoints;

public sealed record SyncedCryptoAssetDto(
    string Asset,
    decimal Quantity,
    decimal PriceUsdt,
    decimal ValueUsdt,
    string Action);

public sealed record SyncBinancePortfolioRequest(
    string? ApiKey = null,
    string? ApiSecret = null);

public sealed record SyncBinancePortfolioResponse(
    int AssetsSynced,
    decimal TotalValuationUsdt,
    List<SyncedCryptoAssetDto> Assets,
    string Message);

public static class BinanceEndpoints
{
    private sealed record CryptoMeta(string Name, string Color);

    private static readonly Dictionary<string, CryptoMeta> KnownAssets = new(StringComparer.OrdinalIgnoreCase)
    {
        ["BTC"] = new("Bitcoin (BTC)", "amber"),
        ["ETH"] = new("Ethereum (ETH)", "violet"),
        ["SOL"] = new("Solana (SOL)", "emerald"),
        ["BNB"] = new("BNB", "amber"),
        ["USDT"] = new("Tether (USDT)", "teal"),
        ["USDC"] = new("USD Coin (USDC)", "blue"),
        ["XRP"] = new("XRP", "cyan"),
        ["ADA"] = new("Cardano (ADA)", "blue"),
        ["AVAX"] = new("Avalanche (AVAX)", "rose"),
        ["DOGE"] = new("Dogecoin (DOGE)", "amber"),
        ["DOT"] = new("Polkadot (DOT)", "pink"),
        ["LINK"] = new("Chainlink (LINK)", "blue"),
        ["SUI"] = new("Sui (SUI)", "cyan"),
        ["NEAR"] = new("NEAR Protocol", "indigo"),
        ["PEPE"] = new("Pepe (PEPE)", "emerald"),
    };

    public static RouteGroupBuilder MapBinanceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/integrations/binance")
            .WithTags("Binance")
            .RequireAuthorization();

        group.MapGet("/status", async (
            IBinanceSyncService service,
            CancellationToken ct) =>
        {
            var result = await service.GetStatusAsync(ct);
            return result.ToHttpResult();
        })
        .WithName("GetBinanceStatus")
        .WithSummary("Get Binance connection status and masked API key.")
        .Produces<BinanceCredentialStatusDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/connect", async (
            [FromBody] ConnectBinanceKeyRequest request,
            IBinanceSyncService service,
            CancellationToken ct) =>
        {
            var result = await service.ConnectKeyAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("ConnectBinanceKey")
        .WithSummary("Connect and securely encrypt a read-only Binance API key (Rule 18, ING-14).")
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

        group.MapPost("/sync-portfolio", async (
            [FromBody] SyncBinancePortfolioRequest? request,
            IBinanceSyncService binanceService,
            IInvestmentService investmentService,
            CancellationToken ct) =>
        {
            var balancesResult = await binanceService.GetBalancesAsync(request?.ApiKey, request?.ApiSecret, ct);
            if (!balancesResult.IsSuccess)
            {
                return balancesResult.ToHttpResult();
            }

            var balances = balancesResult.Value!;
            var syncedAssets = new List<SyncedCryptoAssetDto>();
            decimal totalValuationUsdt = decimal.Zero;

            var existingInvestmentsResult = await investmentService.GetAllAsync(ct);
            var existingInvestments = existingInvestmentsResult.IsSuccess
                ? existingInvestmentsResult.Value!
                : new List<InvestmentDto>();

            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(15);

            // Fetch all ticker prices from Binance in a single call for maximum speed and complete asset coverage
            var priceMap = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            try
            {
                var allTickersRes = await httpClient.GetAsync("https://api.binance.com/api/v3/ticker/price", ct);
                if (allTickersRes.IsSuccessStatusCode)
                {
                    var tickersContent = await allTickersRes.Content.ReadAsStringAsync(ct);
                    using var tickersDoc = System.Text.Json.JsonDocument.Parse(tickersContent);
                    if (tickersDoc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        foreach (var t in tickersDoc.RootElement.EnumerateArray())
                        {
                            var sym = t.GetProperty("symbol").GetString();
                            var pStr = t.GetProperty("price").GetString();
                            if (!string.IsNullOrEmpty(sym) && decimal.TryParse(pStr, System.Globalization.CultureInfo.InvariantCulture, out var p))
                            {
                                priceMap[sym] = p;
                            }
                        }
                    }
                }
            }
            catch
            {
                // If bulk price fails, fallback logic continues
            }

            foreach (var b in balances)
            {
                var totalQty = b.Free + b.Locked;
                if (totalQty <= decimal.Zero) continue;

                var assetUpper = b.Asset.ToUpperInvariant();
                decimal price = decimal.One;

                if (assetUpper == "USDT" || assetUpper == "USDC")
                {
                    price = decimal.One;
                }
                else if (priceMap.TryGetValue($"{assetUpper}USDT", out var usdtPrice))
                {
                    price = usdtPrice;
                }
                else if (priceMap.TryGetValue($"{assetUpper}USDC", out var usdcPrice))
                {
                    price = usdcPrice;
                }
                else if (priceMap.TryGetValue($"{assetUpper}BTC", out var btcPrice) && priceMap.TryGetValue("BTCUSDT", out var btcUsdt))
                {
                    price = btcPrice * btcUsdt;
                }

                var valueUsdt = Math.Round(totalQty * price, 2);
                if (valueUsdt <= decimal.Zero) continue;

                totalValuationUsdt += valueUsdt;

                // Determine display name and color
                var assetMeta = KnownAssets.TryGetValue(assetUpper, out var meta)
                    ? meta
                    : new CryptoMeta($"{assetUpper} (Binance)", "amber");

                // Find matching existing investment by name, ticker, or symbol
                var existing = existingInvestments.FirstOrDefault(i =>
                    i.Name.Equals(assetMeta.Name, StringComparison.OrdinalIgnoreCase) ||
                    i.Name.StartsWith(b.Asset + " ", StringComparison.OrdinalIgnoreCase) ||
                    i.Name.StartsWith(b.Asset + "(", StringComparison.OrdinalIgnoreCase) ||
                    i.Name.Equals(b.Asset, StringComparison.OrdinalIgnoreCase) ||
                    i.Name.Contains($"({b.Asset})", StringComparison.OrdinalIgnoreCase));

                string action;
                if (existing is not null)
                {
                    await investmentService.UpdateValueAsync(
                        existing.Id,
                        new UpdateInvestmentValueRequest(valueUsdt, totalQty),
                        ct);
                    action = "Updated";
                }
                else
                {
                    await investmentService.CreateAsync(
                        new CreateInvestmentRequest(
                            assetMeta.Name,
                            "crypto",
                            "coins",
                            assetMeta.Color,
                            "USDT",
                            totalQty,
                            valueUsdt),
                        ct);
                    action = "Created";
                }

                syncedAssets.Add(new SyncedCryptoAssetDto(b.Asset, totalQty, price, valueUsdt, action));
            }

            return Results.Ok(new SyncBinancePortfolioResponse(
                syncedAssets.Count,
                totalValuationUsdt,
                syncedAssets,
                $"Se sincronizaron con éxito {syncedAssets.Count} criptomonedas desde Binance (${totalValuationUsdt:N2} USDT)."));
        })
        .WithName("SyncBinancePortfolio")
        .WithSummary("Sync Spot balances from Binance and create or update investments in Planning.")
        .Produces<SyncBinancePortfolioResponse>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }
}
