using BuildingBlocks.Currencies;
using Fx.Application.Abstractions;
using Fx.Application.Services;
using Fx.Domain.Rates;
using FluentAssertions;

namespace Api.Tests;

public sealed class RateSnapshotServiceTests
{
    [Fact]
    public async Task ExplicitSideSelectsUnderlyingBobUsdBuyAndSellWithoutChangingDefaultBuy()
    {
        var userId = Guid.NewGuid();
        var storedRate = ExchangeRate.CreateMarketRate(
            Currency.BOB, Currency.USD, 12m, 11.5m, "DolarApi:BinanceP2P", DateTime.UtcNow);
        var repository = new StubRateRepository(storedRate);
        var source = new UnusedRateSource();
        var service = new RateSnapshotService(repository, source);

        var defaultSnapshot = await service.GetSnapshotAsync("BOB", "USD", userId);
        var buySnapshot = await service.GetSnapshotAsync("BOB", "USD", Fx.Contracts.RateSide.Buy, userId);
        var sellSnapshot = await service.GetSnapshotAsync("BOB", "USD", Fx.Contracts.RateSide.Sell, userId);
        var reverseOrientationSell = await service.GetSnapshotAsync("USD", "BOB", Fx.Contracts.RateSide.Sell, userId);
        var reverseDefaultSnapshot = await service.GetSnapshotAsync("USD", "BOB", userId);

        defaultSnapshot!.AppliedRate.Should().Be(12m);
        defaultSnapshot.Side.Should().Be(Fx.Contracts.RateSide.Buy);
        buySnapshot!.AppliedRate.Should().Be(12m);
        buySnapshot.Side.Should().Be(Fx.Contracts.RateSide.Buy);
        sellSnapshot!.AppliedRate.Should().Be(11.5m);
        sellSnapshot.Side.Should().Be(Fx.Contracts.RateSide.Sell);
        reverseOrientationSell!.AppliedRate.Should().Be(11.5m);
        reverseDefaultSnapshot!.AppliedRate.Should().Be(11.5m);
        reverseDefaultSnapshot.Side.Should().Be(Fx.Contracts.RateSide.Sell);
        repository.LastUserId.Should().Be(userId);
        repository.RequestedPair.Should().Be((Currency.BOB, Currency.USD));
    }

    private sealed class StubRateRepository(ExchangeRate rate) : IExchangeRateRepository
    {
        public Guid? LastUserId { get; private set; }
        public (Currency Currency, Currency BaseCurrency) RequestedPair { get; private set; }

        public Task<ExchangeRate?> GetLatestRateAsync(Currency currency, Currency baseCurrency, Guid? userId = null, CancellationToken cancellationToken = default)
        {
            LastUserId = userId;
            RequestedPair = (currency, baseCurrency);
            return Task.FromResult<ExchangeRate?>(rate);
        }

        public Task AddAsync(ExchangeRate exchangeRate, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => Task.FromResult(0);
    }

    private sealed class UnusedRateSource : IRateSource
    {
        public string SourceName => "Unused";

        public Task<ExchangeRate?> GetRateAsync(Currency currency, Currency baseCurrency, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("The cached fixture should be used.");
    }
}
