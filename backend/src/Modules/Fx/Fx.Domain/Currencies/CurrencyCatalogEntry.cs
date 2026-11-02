namespace Fx.Domain.Currencies;

public sealed class CurrencyCatalogEntry
{
    private CurrencyCatalogEntry()
    {
    }

    public CurrencyCatalogEntry(string code, string name, string symbol, int precision, bool isActive)
    {
        Code = code.Trim().ToUpperInvariant();
        Name = name;
        Symbol = symbol;
        Precision = precision;
        IsActive = isActive;
    }

    public string Code { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string Symbol { get; private set; } = null!;
    public int Precision { get; private set; }
    public bool IsActive { get; private set; }
}
