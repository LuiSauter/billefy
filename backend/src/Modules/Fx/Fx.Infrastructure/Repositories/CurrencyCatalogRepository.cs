using Fx.Application.Abstractions;
using Fx.Domain.Currencies;
using Microsoft.EntityFrameworkCore;

namespace Fx.Infrastructure.Repositories;

public sealed class CurrencyCatalogRepository(FxDbContext context) : ICurrencyCatalogRepository
{
    public async Task<IReadOnlyList<CurrencyCatalogEntry>> GetActiveAsync(CancellationToken cancellationToken = default) =>
        await context.CurrencyCatalogEntries.AsNoTracking()
            .Where(entry => entry.IsActive)
            .OrderBy(entry => entry.Code)
            .ToArrayAsync(cancellationToken);

    public Task<bool> IsActiveAsync(string code, CancellationToken cancellationToken = default) =>
        context.CurrencyCatalogEntries.AsNoTracking()
            .AnyAsync(entry => entry.Code == code && entry.IsActive, cancellationToken);
}
