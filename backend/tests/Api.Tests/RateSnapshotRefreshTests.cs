using BuildingBlocks.Currencies;
using BuildingBlocks.Time;
using Fx.Application.Abstractions;
using Fx.Application.Services;
using Fx.Domain.Rates;
using FluentAssertions;

namespace Api.Tests;

public sealed class RateSnapshotRefreshTests
{
    private static readonly DateTime Now = new(2026, 11, 2, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task StaleMarketQuote_IsRefreshedAndReturned()
    {
        var repository = new MemoryRateRepository(MarketRate(10m, 11m, Now.AddHours(-1)));
        var source = new StubRateSource(_ => Task.FromResult<ExchangeRate?>(MarketRate(12m, 13m, Now)));
        var service = CreateService(repository, source);

        var snapshot = await service.GetSnapshotAsync("BOB", "USD");

        snapshot!.AppliedRate.Should().Be(12m);
        snapshot.FetchedAt.Should().Be(Now);
        snapshot.IsStale.Should().BeFalse();
        source.CallCount.Should().Be(1);
    }

    [Fact]
    public async Task ConcurrentStaleRequests_CoalesceAndCooldownAvoidsRepeatedRefresh()
    {
        var repository = new MemoryRateRepository(MarketRate(10m, 11m, Now.AddHours(-1)));
        var refreshStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var releaseRefresh = new TaskCompletionSource<ExchangeRate?>(TaskCreationOptions.RunContinuationsAsynchronously);
        var source = new StubRateSource(_ =>
        {
            refreshStarted.TrySetResult();
            return releaseRefresh.Task;
        });
        var service = CreateService(repository, source);

        var first = service.GetSnapshotAsync("BOB", "USD");
        await refreshStarted.Task;
        var second = service.GetSnapshotAsync("USD", "BOB");
        releaseRefresh.SetResult(null);
        await Task.WhenAll(first, second);
        await service.GetSnapshotAsync("BOB", "USD");

        source.CallCount.Should().Be(1);
        repository.GetCount.Should().BeGreaterThanOrEqualTo(3);
    }

    [Fact]
    public async Task ProviderFailure_ReturnsPriorQuoteUnchangedAndStale()
    {
        var lastKnown = MarketRate(10m, 11m, Now.AddHours(-1));
        var repository = new MemoryRateRepository(lastKnown);
        var source = new StubRateSource(_ => throw new HttpRequestException("provider unavailable"));
        var service = CreateService(repository, source);

        var snapshot = await service.GetSnapshotAsync("BOB", "USD");

        snapshot!.AppliedRate.Should().Be(10m);
        snapshot.FetchedAt.Should().Be(lastKnown.FetchedAt);
        snapshot.RateSource.Should().Be(lastKnown.Source);
        snapshot.IsStale.Should().BeTrue();
        repository.StoredMarketRate.Should().BeSameAs(lastKnown);
    }

    [Fact]
    public async Task StaleManualOverride_IsReturnedWithoutMarketRefresh()
    {
        var userId = Guid.NewGuid();
        var manual = ExchangeRate.CreateManualRate(userId, Currency.BOB, Currency.USD, 15m, Now.AddHours(-1));
        var repository = new MemoryRateRepository(MarketRate(10m, 11m, Now.AddHours(-1)), manual);
        var source = new StubRateSource(_ => Task.FromResult<ExchangeRate?>(MarketRate(12m, 13m, Now)));
        var service = CreateService(repository, source);

        var snapshot = await service.GetSnapshotAsync("BOB", "USD", userId);

        snapshot!.AppliedRate.Should().Be(15m);
        snapshot.RateSource.Should().Be("Manual");
        snapshot.FetchedAt.Should().Be(manual.FetchedAt);
        snapshot.IsStale.Should().BeTrue();
        source.CallCount.Should().Be(0);
    }

    [Theory]
    [InlineData("BOB", "USD", "12")]
    [InlineData("USD", "BOB", "13")]
    public async Task BobUsdSnapshots_ExposeUsdtProxyAndCorrectSide(string currency, string baseCurrency, string expectedRate)
    {
        var repository = new MemoryRateRepository(MarketRate(12m, 13m, Now));
        var source = new StubRateSource(_ => throw new InvalidOperationException("Fresh cache should be used."));
        var service = CreateService(repository, source);

        var snapshot = await service.GetSnapshotAsync(currency, baseCurrency);

        snapshot!.AppliedRate.Should().Be(decimal.Parse(expectedRate, System.Globalization.CultureInfo.InvariantCulture));
        snapshot.Side.Should().Be(currency == "BOB" ? Fx.Contracts.RateSide.Buy : Fx.Contracts.RateSide.Sell);
        snapshot.ValuationBasis.Should().Be("USDT_PROXY");
    }

    private static RateSnapshotService CreateService(MemoryRateRepository repository, StubRateSource source) =>
        new(repository, source, new FixedClock(Now));

    private static ExchangeRate MarketRate(decimal buy, decimal sell, DateTime fetchedAt) =>
        ExchangeRate.CreateMarketRate(Currency.BOB, Currency.USD, buy, sell, "DolarApi:BinanceP2P", fetchedAt);

    private sealed class MemoryRateRepository(ExchangeRate? marketRate, ExchangeRate? manualRate = null) : IExchangeRateRepository
    {
        public ExchangeRate? StoredMarketRate { get; private set; } = marketRate;
        public int GetCount { get; private set; }

        public Task<ExchangeRate?> GetLatestRateAsync(Currency currency, Currency baseCurrency, Guid? userId = null, CancellationToken cancellationToken = default)
        {
            GetCount++;
            return Task.FromResult(userId.HasValue && manualRate is not null ? manualRate : StoredMarketRate);
        }

        public Task AddAsync(ExchangeRate rate, CancellationToken cancellationToken = default)
        {
            if (rate.UserId is null)
                StoredMarketRate = rate;
            return Task.CompletedTask;
        }

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => Task.FromResult(1);
    }

    private sealed class StubRateSource(Func<CancellationToken, Task<ExchangeRate?>> getRate) : IRateSource
    {
        public string SourceName => "DolarApi:BinanceP2P";
        public int CallCount { get; private set; }

        public Task<ExchangeRate?> GetRateAsync(Currency currency, Currency baseCurrency, CancellationToken cancellationToken = default)
        {
            CallCount++;
            return getRate(cancellationToken);
        }
    }

    private sealed class FixedClock(DateTime utcNow) : IClock
    {
        public DateTime UtcNow => utcNow;
        public DateOnly TodayUtc => DateOnly.FromDateTime(utcNow);
    }
}
