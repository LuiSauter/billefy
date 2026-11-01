using BuildingBlocks.Currencies;
using Fx.Application.Abstractions;
using Fx.Contracts;
using Fx.Domain.Rates;
using Fx.Domain.Services;
using SnapshotRateSide = Fx.Contracts.RateSide;

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

        var local = Currency.FromCode("BOB");
        var dollar = Currency.FromCode("USD");
        if ((currency.Code == dollar.Code && baseCurrency.Code == local.Code) ||
            (currency.Code == local.Code && baseCurrency.Code == dollar.Code))
        {
            var rate = await _rateRepository.GetLatestRateAsync(local, dollar, userId, cancellationToken);
            if (rate is null)
            {
                rate = await _rateSource.GetRateAsync(local, dollar, cancellationToken);
                if (rate is not null)
                {
                    await _rateRepository.AddAsync(rate, cancellationToken);
                    await _rateRepository.SaveChangesAsync(cancellationToken);
                }
            }

            if (rate is null)
                return null;

            var side = currency.Code == rate.Currency.Code ? SnapshotRateSide.Buy : SnapshotRateSide.Sell;
            return new RateSnapshotDto(
                ExchangeRateConverter.GetApplicableRate(currency, rate),
                rate.Source,
                rate.FetchedAt,
                rate.IsStale(DateTime.UtcNow, StalenessThreshold),
                side);
        }

        var genericRate = await _rateRepository.GetLatestRateAsync(currency, baseCurrency, userId, cancellationToken);
        if (genericRate is null)
        {
            genericRate = await _rateSource.GetRateAsync(currency, baseCurrency, cancellationToken);
            if (genericRate is not null)
            {
                await _rateRepository.AddAsync(genericRate, cancellationToken);
                await _rateRepository.SaveChangesAsync(cancellationToken);
            }
        }

        if (genericRate is null)
            return null;

        var genericSide = currency.Code == genericRate.Currency.Code ? SnapshotRateSide.Buy : SnapshotRateSide.Sell;
        return new RateSnapshotDto(
            ExchangeRateConverter.GetApplicableRate(currency, genericRate),
            genericRate.Source,
            genericRate.FetchedAt,
            genericRate.IsStale(DateTime.UtcNow, StalenessThreshold),
            genericSide);
    }

    public async Task<RateSnapshotDto?> GetSnapshotAsync(
        string currencyCode,
        string baseCurrencyCode,
        SnapshotRateSide side,
        Guid? userId = null,
        CancellationToken cancellationToken = default)
    {
        var currency = Currency.FromCode(currencyCode);
        var baseCurrency = Currency.FromCode(baseCurrencyCode);

        // The stored rate is oriented BOB/USD: Buy converts BOB / rate to USD,
        // while Sell converts USD * rate to BOB. Select the named side directly.
        var local = Currency.FromCode("BOB");
        var dollar = Currency.FromCode("USD");
        if (!((currency.Code == local.Code && baseCurrency.Code == dollar.Code) ||
              (currency.Code == dollar.Code && baseCurrency.Code == local.Code)))
            return null;

        var rate = await _rateRepository.GetLatestRateAsync(local, dollar, userId, cancellationToken);
        if (rate is null)
        {
            rate = await _rateSource.GetRateAsync(local, dollar, cancellationToken);
            if (rate is not null)
            {
                await _rateRepository.AddAsync(rate, cancellationToken);
                await _rateRepository.SaveChangesAsync(cancellationToken);
            }
        }

        if (rate is null)
            return null;

        var appliedRate = side switch
        {
            SnapshotRateSide.Buy => rate.BuyRate,
            SnapshotRateSide.Sell => rate.SellRate,
            _ => throw new ArgumentOutOfRangeException(nameof(side), side, "Unsupported rate side.")
        };
        return new RateSnapshotDto(
            appliedRate,
            rate.Source,
            rate.FetchedAt,
            rate.IsStale(DateTime.UtcNow, StalenessThreshold),
            side);
    }
}
