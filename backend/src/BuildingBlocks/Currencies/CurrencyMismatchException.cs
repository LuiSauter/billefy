namespace BuildingBlocks.Currencies;

public sealed class CurrencyMismatchException : InvalidOperationException
{
    public Currency Expected { get; }
    public Currency Actual { get; }

    public CurrencyMismatchException(Currency expected, Currency actual)
        : base($"Currency mismatch: expected '{expected.Code}', but got '{actual.Code}'.")
    {
        Expected = expected;
        Actual = actual;
    }
}
