using System.Globalization;
using BuildingBlocks.Currencies;

namespace BuildingBlocks.ValueObjects;

public readonly struct Money : IEquatable<Money>, IComparable<Money>
{
    public decimal Amount { get; }
    public Currency Currency { get; }

    public Money(decimal amount, Currency currency)
    {
        Currency = currency ?? throw new ArgumentNullException(nameof(currency));
        Amount = RoundToScale(amount, currency.DecimalPlaces);
    }

    public static Money Of(decimal amount, Currency currency) => new(amount, currency);

    public static Money Zero(Currency currency) => new(decimal.Zero, currency);

    public bool IsZero => Amount == decimal.Zero;
    public bool IsPositive => Amount > decimal.Zero;
    public bool IsNegative => Amount < decimal.Zero;

    public Money Abs() => new(Math.Abs(Amount), Currency);

    public static Money operator +(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return new Money(left.Amount + right.Amount, left.Currency);
    }

    public static Money operator -(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return new Money(left.Amount - right.Amount, left.Currency);
    }

    public static Money operator -(Money money) => new(-money.Amount, money.Currency);

    public static Money operator *(Money money, decimal multiplier) =>
        new(RoundToScale(money.Amount * multiplier, money.Currency.DecimalPlaces), money.Currency);

    public static Money operator *(decimal multiplier, Money money) => money * multiplier;

    public static Money operator /(Money money, decimal divisor)
    {
        if (divisor == decimal.Zero)
        {
            throw new DivideByZeroException("Cannot divide Money by zero.");
        }

        return new Money(RoundToScale(money.Amount / divisor, money.Currency.DecimalPlaces), money.Currency);
    }

    public static bool operator ==(Money left, Money right) => left.Equals(right);
    public static bool operator !=(Money left, Money right) => !left.Equals(right);

    public static bool operator <(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount < right.Amount;
    }

    public static bool operator <=(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount <= right.Amount;
    }

    public static bool operator >(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount > right.Amount;
    }

    public static bool operator >=(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount >= right.Amount;
    }

    public bool Equals(Money other) =>
        Amount == other.Amount &&
        (Currency == null && other.Currency == null ||
         Currency != null && other.Currency != null && Currency.Code == other.Currency.Code);

    public override bool Equals(object? obj) => obj is Money other && Equals(other);

    public override int GetHashCode() => HashCode.Combine(Amount, Currency?.Code);

    public int CompareTo(Money other)
    {
        EnsureSameCurrency(this, other);
        return Amount.CompareTo(other.Amount);
    }

    public override string ToString() =>
        string.Create(CultureInfo.InvariantCulture, $"{Amount.ToString($"F{Currency.DecimalPlaces}", CultureInfo.InvariantCulture)} {Currency.Code}");

    public static decimal RoundToScale(decimal amount, int scale) =>
        Math.Round(amount, scale, MidpointRounding.AwayFromZero);

    private static void EnsureSameCurrency(Money left, Money right)
    {
        if (left.Currency != right.Currency && left.Currency.Code != right.Currency.Code)
        {
            throw new CurrencyMismatchException(left.Currency, right.Currency);
        }
    }
}
