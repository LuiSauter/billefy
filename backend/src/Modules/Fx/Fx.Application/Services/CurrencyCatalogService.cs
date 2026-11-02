using Fx.Application.Abstractions;
using Fx.Contracts;

namespace Fx.Application.Services;

public sealed class CurrencyCatalogService(ICurrencyCatalogRepository repository) : ICurrencyCatalog
{
    public async Task<IReadOnlyList<CurrencyCatalogEntryDto>> GetActiveCurrenciesAsync(
        CancellationToken cancellationToken = default)
    {
        var entries = await repository.GetActiveAsync(cancellationToken);
        return entries.Select(entry => new CurrencyCatalogEntryDto(
            entry.Code, entry.Name, entry.Symbol, entry.Precision, entry.IsActive)).ToArray();
    }

    public Task<bool> IsActiveAsync(string code, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code)) return Task.FromResult(false);
        return repository.IsActiveAsync(code.Trim().ToUpperInvariant(), cancellationToken);
    }
}
