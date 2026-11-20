namespace Fx.Contracts;

public interface ICurrencyCatalog
{
    Task<IReadOnlyList<CurrencyCatalogEntryDto>> GetActiveCurrenciesAsync(CancellationToken cancellationToken = default);
    Task<bool> IsActiveAsync(string code, CancellationToken cancellationToken = default);
}
