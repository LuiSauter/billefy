using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Fx.Domain.Rates;

namespace Fx.Domain.Services;

public static class ExchangeRateConverter
{
    /// <summary>
    /// Applies Rule 19 / FX-02:
    /// - A user holding local currency sees the buy rate (valuing local currency in USD uses buy: local / buyRate).
    /// - A user holding USD sees the sell rate (valuing USD in local currency uses sell: usd * sellRate).
    /// </summary>
    public static Money Convert(Money sourceMoney, Currency targetCurrency, ExchangeRate rate)
    {
        if (sourceMoney.Currency == targetCurrency || sourceMoney.Currency.Code == targetCurrency.Code)
        {
            return sourceMoney;
        }

        // Case 1: Holding Local Currency, converting to USD
        if (sourceMoney.Currency.Code == rate.Currency.Code && targetCurrency.Code == rate.BaseCurrency.Code)
        {
            var convertedAmount = sourceMoney.Amount / rate.BuyRate;
            return Money.Of(convertedAmount, targetCurrency);
        }

        // Case 2: Holding USD, converting to Local Currency
        if (sourceMoney.Currency.Code == rate.BaseCurrency.Code && targetCurrency.Code == rate.Currency.Code)
        {
            var convertedAmount = sourceMoney.Amount * rate.SellRate;
            return Money.Of(convertedAmount, targetCurrency);
        }

        throw new InvalidOperationException(
            $"Cannot convert from '{sourceMoney.Currency.Code}' to '{targetCurrency.Code}' with rate for '{rate.Currency.Code}/{rate.BaseCurrency.Code}'.");
    }

    /// <summary>
    /// Returns the applicable rate for display according to user's held currency:
    /// - Holding local currency: returns BuyRate
    /// - Holding base currency (USD): returns SellRate
    /// </summary>
    public static decimal GetApplicableRate(Currency heldCurrency, ExchangeRate rate)
    {
        if (heldCurrency.Code == rate.Currency.Code)
        {
            return rate.BuyRate;
        }

        if (heldCurrency.Code == rate.BaseCurrency.Code)
        {
            return rate.SellRate;
        }

        throw new ArgumentException($"Currency '{heldCurrency.Code}' does not match rate pair '{rate.Currency.Code}/{rate.BaseCurrency.Code}'.", nameof(heldCurrency));
    }
}
