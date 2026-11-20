using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Fx.Domain.Rates;
using Fx.Domain.Services;
using Xunit;

namespace Fx.Domain.Tests;

public class ExchangeRateConverterTests
{
    private readonly ExchangeRate _sampleRate = ExchangeRate.CreateMarketRate(
        Currency.BOB,
        Currency.USD,
        buyRate: 12.00m,
        sellRate: 11.50m,
        source: "DolarApi:BinanceP2P",
        fetchedAt: new DateTime(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc));

    [Fact]
    public void Convert_LocalCurrencyToUsd_ShouldUseBuyRate()
    {
        // 120 BOB converted to USD with Buy=12.00 -> 10.00 USD
        var localMoney = Money.Of(120m, Currency.BOB);
        var converted = ExchangeRateConverter.Convert(localMoney, Currency.USD, _sampleRate);

        converted.Currency.Should().Be(Currency.USD);
        converted.Amount.Should().Be(10.00m);
    }

    [Fact]
    public void Convert_UsdToLocalCurrency_ShouldUseSellRate()
    {
        // 10 USD converted to BOB with Sell=11.50 -> 115.00 BOB
        var usdMoney = Money.Of(10m, Currency.USD);
        var converted = ExchangeRateConverter.Convert(usdMoney, Currency.BOB, _sampleRate);

        converted.Currency.Should().Be(Currency.BOB);
        converted.Amount.Should().Be(115.00m);
    }

    [Fact]
    public void Convert_SameCurrency_ShouldReturnUnchanged()
    {
        var money = Money.Of(50m, Currency.BOB);
        var converted = ExchangeRateConverter.Convert(money, Currency.BOB, _sampleRate);

        converted.Should().Be(money);
    }

    [Fact]
    public void GetApplicableRate_ShouldReturnBuyForLocal_AndSellForUsd()
    {
        var bobRate = ExchangeRateConverter.GetApplicableRate(Currency.BOB, _sampleRate);
        bobRate.Should().Be(12.00m); // Buy rate

        var usdRate = ExchangeRateConverter.GetApplicableRate(Currency.USD, _sampleRate);
        usdRate.Should().Be(11.50m); // Sell rate
    }

    [Fact]
    public void IsStale_ShouldDetectStaleRates()
    {
        var fetchedAt = new DateTime(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc);
        var rate = ExchangeRate.CreateMarketRate(Currency.BOB, Currency.USD, 12m, 11m, "Test", fetchedAt);

        rate.IsStale(fetchedAt.AddMinutes(4), TimeSpan.FromMinutes(5)).Should().BeFalse();
        rate.IsStale(fetchedAt.AddMinutes(6), TimeSpan.FromMinutes(5)).Should().BeTrue();
    }
}
