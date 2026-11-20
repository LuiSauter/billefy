namespace Fx.Contracts;

public sealed record CurrencyCatalogEntryDto(
    string Code,
    string Name,
    string Symbol,
    int Precision,
    bool IsActive);
