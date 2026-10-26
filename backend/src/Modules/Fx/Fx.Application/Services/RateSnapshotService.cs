using BuildingBlocks.Currencies;
using Fx.Application.Abstractions;
using Fx.Contracts;
using Fx.Domain.Rates;
using Fx.Domain.Services;

namespace Fx.Application.Services;

public sealed class RateSnapshotService : IRateSnapshotProvider
{
    private readonly IExchangeRateRepository _rateRepository;
    private readonly IRateSource _rateSource;

    private static readonly TimeSpan StalenessThreshold = TimeSpan.FromMinutes(15);

    public RateSnapshotService(IExchangeRateRepository rateRepository, IRateSource rateSource)
    {
        _rateRepository = rateRepository;
        _rateSource = rateSource;
    }

    public async Task<RateSnapshotDto?> GetSnapshotAsync(
        string currencyCode,
        string baseCurrencyCode,
        Guid? userId = null,
        CancellationToken cancellationToken = default)
    {
        var currency = Currency.FromCode(currencyCode);
        var baseCurrency = Currency.FromCode(baseCurrencyCode);

        // 1. Try to get from repository (manual or cached market rate)
        var rate = await _rateRepository.GetLatestRateAsync(currency, baseCurrency, userId, cancellationToken);

        // 2. If no rate in DB, fetch fresh from IRateSource
        if (rate is null)
        {
            rate = await _rateSource.GetRateAsync(currency, baseCurrency, cancellationToken);
            if (rate is not null)
            {
                await _rateRepository.AddAsync(rate, cancellationToken);
                await _rateRepository.SaveChangesAsync(cancellationToken);
            }
        }

        if (rate is null)
        {
            return null;
        }

        // Apply buy/sell reading rule: holding currency sees buy; holding USD sees sell
        var applicableRate = ExchangeRateConverter.GetApplicableRate(currency, rate);
        var isStale = rate.IsStale(DateTime.UtcNow, StalenessThreshold);

        return new RateSnapshotDto(
            applicableRate,
            rate.Source,
            rate.FetchedAt,
            isStale);
    }
}
