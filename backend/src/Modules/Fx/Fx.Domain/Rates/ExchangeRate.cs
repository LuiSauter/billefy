using BuildingBlocks.Currencies;

namespace Fx.Domain.Rates;

public sealed class ExchangeRate
{
    public Guid Id { get; private set; }
    public Currency Currency { get; private set; }
    public Currency BaseCurrency { get; private set; }
    public decimal BuyRate { get; private set; }
    public decimal SellRate { get; private set; }
    public string Source { get; private set; }
    public DateTime FetchedAt { get; private set; }
    public Guid? UserId { get; private set; }

    // Required by EF Core
    private ExchangeRate()
    {
        Currency = null!;
        BaseCurrency = null!;
        Source = null!;
    }

    private ExchangeRate(
        Guid id,
        Currency currency,
        Currency baseCurrency,
        decimal buyRate,
        decimal sellRate,
        string source,
        DateTime fetchedAt,
        Guid? userId)
    {
        if (buyRate <= decimal.Zero)
        {
            throw new ArgumentException("Buy rate must be strictly greater than zero.", nameof(buyRate));
        }

        if (sellRate <= decimal.Zero)
        {
            throw new ArgumentException("Sell rate must be strictly greater than zero.", nameof(sellRate));
        }

        ArgumentNullException.ThrowIfNull(currency);
        ArgumentNullException.ThrowIfNull(baseCurrency);
        ArgumentException.ThrowIfNullOrWhiteSpace(source);

        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        Currency = currency;
        BaseCurrency = baseCurrency;
        BuyRate = buyRate;
        SellRate = sellRate;
        Source = source.Trim();
        FetchedAt = fetchedAt;
        UserId = userId;
    }

    public static ExchangeRate CreateMarketRate(
        Currency currency,
        Currency baseCurrency,
        decimal buyRate,
        decimal sellRate,
        string source,
        DateTime fetchedAt) =>
        new(Guid.NewGuid(), currency, baseCurrency, buyRate, sellRate, source, fetchedAt, userId: null);

    public static ExchangeRate CreateManualRate(
        Guid userId,
        Currency currency,
        Currency baseCurrency,
        decimal rate,
        DateTime fetchedAt) =>
        new(Guid.NewGuid(), currency, baseCurrency, rate, rate, "Manual", fetchedAt, userId);

    public bool IsStale(DateTime currentTime, TimeSpan threshold) =>
        currentTime - FetchedAt > threshold;
}
