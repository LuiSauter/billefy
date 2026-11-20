using Fx.Domain.Currencies;

namespace Fx.Application.Abstractions;

public interface ICurrencyCatalogRepository
{
    Task<IReadOnlyList<CurrencyCatalogEntry>> GetActiveAsync(CancellationToken cancellationToken = default);
    Task<bool> IsActiveAsync(string code, CancellationToken cancellationToken = default);
}
