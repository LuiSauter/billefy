using BuildingBlocks.Currencies;

namespace Fx.Domain.Rates;

public interface IRateSource
{
    string SourceName { get; }

    Task<ExchangeRate?> GetRateAsync(
        Currency currency,
        Currency baseCurrency,
        CancellationToken cancellationToken = default);
}
