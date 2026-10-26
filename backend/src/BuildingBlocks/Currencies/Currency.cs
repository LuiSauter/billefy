namespace BuildingBlocks.Currencies;

public sealed record Currency
{
    public static readonly Currency BOB = new("BOB", 2);
    public static readonly Currency USD = new("USD", 2);
    public static readonly Currency USDT = new("USDT", 2);
    public static readonly Currency EUR = new("EUR", 2);
    public static readonly Currency BTC = new("BTC", 8);

    public string Code { get; }
    public int DecimalPlaces { get; }

    private Currency(string code, int decimalPlaces)
    {
        Code = code;
        DecimalPlaces = decimalPlaces;
    }

    public static Currency FromCode(string code, int decimalPlaces = 2)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code);

        string normalized = code.Trim().ToUpperInvariant();

        return normalized switch
        {
            "BOB" => BOB,
            "USD" => USD,
            "USDT" => USDT,
            "EUR" => EUR,
            "BTC" => BTC,
            _ => new Currency(normalized, decimalPlaces)
        };
    }

    public override string ToString() => Code;
}
