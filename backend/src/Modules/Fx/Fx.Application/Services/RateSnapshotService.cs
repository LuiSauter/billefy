using BuildingBlocks.Currencies;
using BuildingBlocks.Time;
using Fx.Application.Abstractions;
using Fx.Contracts;
using Fx.Domain.Rates;
using Fx.Domain.Services;
using SnapshotRateSide = Fx.Contracts.RateSide;

namespace Fx.Application.Services;

public sealed class RateSnapshotService : IRateSnapshotProvider
{
    private static readonly TimeSpan StalenessThreshold = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan RefreshCooldown = TimeSpan.FromMinutes(1);
    private readonly SemaphoreSlim _marketRefreshGate = new(1, 1);
    private DateTime? _lastMarketRefreshAttemptUtc;

    private readonly IExchangeRateRepository _rateRepository;
    private readonly IRateSource _rateSource;
    private readonly IClock _clock;

    public RateSnapshotService(IExchangeRateRepository rateRepository, IRateSource rateSource, IClock? clock = null)
    {
        _rateRepository = rateRepository;
        _rateSource = rateSource;
        _clock = clock ?? SystemClock.Instance;
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
        var isBobUsdPair = (currency.Code == local.Code && baseCurrency.Code == dollar.Code) ||
                           (currency.Code == dollar.Code && baseCurrency.Code == local.Code);
        var queryCurrency = isBobUsdPair ? local : currency;
        var queryBaseCurrency = isBobUsdPair ? dollar : baseCurrency;
        var rate = await GetLatestRateAsync(queryCurrency, queryBaseCurrency, userId, cancellationToken);
        if (rate is null)
            return null;

        var side = currency.Code == rate.Currency.Code ? SnapshotRateSide.Buy : SnapshotRateSide.Sell;
        return CreateSnapshot(currency, rate, side);
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
        var local = Currency.FromCode("BOB");
        var dollar = Currency.FromCode("USD");
        if (!((currency.Code == local.Code && baseCurrency.Code == dollar.Code) ||
              (currency.Code == dollar.Code && baseCurrency.Code == local.Code)))
            return null;

        var rate = await GetLatestRateAsync(local, dollar, userId, cancellationToken);
        if (rate is null)
            return null;

        var appliedRate = side switch
        {
            SnapshotRateSide.Buy => rate.BuyRate,
            SnapshotRateSide.Sell => rate.SellRate,
            _ => throw new ArgumentOutOfRangeException(nameof(side), side, "Unsupported rate side.")
        };
        return CreateSnapshot(currency, rate, side, appliedRate);
    }

    private async Task<ExchangeRate?> GetLatestRateAsync(
        Currency currency,
        Currency baseCurrency,
        Guid? userId,
        CancellationToken cancellationToken)
    {
        var rate = await _rateRepository.GetLatestRateAsync(currency, baseCurrency, userId, cancellationToken);
        if (rate?.UserId is not null || (rate is not null && !IsStale(rate)))
            return rate;

        await _marketRefreshGate.WaitAsync(cancellationToken);
        try
        {
            // Re-read after acquiring the shared gate so requests queued behind a refresh
            // observe the committed quote or an intervening manual override.
            rate = await _rateRepository.GetLatestRateAsync(currency, baseCurrency, userId, cancellationToken);
            if (rate?.UserId is not null || (rate is not null && !IsStale(rate)))
                return rate;

            var now = _clock.UtcNow;
            if (_lastMarketRefreshAttemptUtc is { } lastAttempt && now - lastAttempt < RefreshCooldown)
                return rate;

            _lastMarketRefreshAttemptUtc = now;
            try
            {
                var refreshed = await _rateSource.GetRateAsync(currency, baseCurrency, cancellationToken);
                if (!IsEligibleMarketRate(refreshed, currency, baseCurrency))
                    return rate;

                await _rateRepository.AddAsync(refreshed!, cancellationToken);
                await _rateRepository.SaveChangesAsync(cancellationToken);
                return refreshed;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception)
            {
                // A source or persistence failure must not discard a valid cached quote.
                return rate;
            }
        }
        finally
        {
            _marketRefreshGate.Release();
        }
    }

    private bool IsStale(ExchangeRate rate) => rate.IsStale(_clock.UtcNow, StalenessThreshold);

    private static bool IsEligibleMarketRate(ExchangeRate? rate, Currency currency, Currency baseCurrency) =>
        rate is not null &&
        rate.UserId is null &&
        rate.Currency.Code == currency.Code &&
        rate.BaseCurrency.Code == baseCurrency.Code &&
        rate.BuyRate > decimal.Zero &&
        rate.SellRate > decimal.Zero;

    private RateSnapshotDto CreateSnapshot(
        Currency requestedCurrency,
        ExchangeRate rate,
        SnapshotRateSide side,
        decimal? appliedRate = null) =>
        new(
            appliedRate ?? ExchangeRateConverter.GetApplicableRate(requestedCurrency, rate),
            rate.Source,
            rate.FetchedAt,
            IsStale(rate),
            side,
            rate.Source == "DolarApi:BinanceP2P" ? "USDT_PROXY" : null);
}
