using System.Net.Http.Json;
using BuildingBlocks.Currencies;
using Fx.Domain.Rates;

namespace Billefy.Integrations.Fx.DolarApi;

public sealed class DolarApiRateSource : IRateSource
{
    private readonly HttpClient _httpClient;

    public string SourceName => "DolarApi:BinanceP2P";

    public DolarApiRateSource(HttpClient httpClient)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
    }

    public async Task<ExchangeRate?> GetRateAsync(
        Currency currency,
        Currency baseCurrency,
        CancellationToken cancellationToken = default)
    {
        // Currently supports parallel rate for Bolivia (BOB/USD) via Binance P2P
        if (currency.Code == "BOB" && baseCurrency.Code == "USD")
        {
            return await FetchBoliviaBinanceRateAsync(currency, baseCurrency, cancellationToken);
        }

        return null;
    }

    private async Task<ExchangeRate?> FetchBoliviaBinanceRateAsync(
        Currency currency,
        Currency baseCurrency,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _httpClient.GetFromJsonAsync<DolarApiResponse>(
                "https://bo.dolarapi.com/v1/dolares/binance",
                cancellationToken);

            if (response is null || response.Compra <= decimal.Zero || response.Venta <= decimal.Zero)
            {
                return null;
            }

            var fetchedAt = response.FechaActualizacion ?? DateTime.UtcNow;

            return ExchangeRate.CreateMarketRate(
                currency,
                baseCurrency,
                buyRate: response.Compra,
                sellRate: response.Venta,
                source: SourceName,
                fetchedAt: fetchedAt);
        }
        catch (HttpRequestException)
        {
            // Transient network failure: return null so fallback in repository takes over
            return null;
        }
        catch (TaskCanceledException)
        {
            return null;
        }
    }
}
