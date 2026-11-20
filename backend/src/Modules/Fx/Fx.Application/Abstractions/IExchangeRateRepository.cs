using BuildingBlocks.Currencies;
using Fx.Domain.Rates;

namespace Fx.Application.Abstractions;

public interface IExchangeRateRepository
{
    Task<ExchangeRate?> GetLatestRateAsync(
        Currency currency,
        Currency baseCurrency,
        Guid? userId = null,
        CancellationToken cancellationToken = default);

    Task AddAsync(ExchangeRate rate, CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
