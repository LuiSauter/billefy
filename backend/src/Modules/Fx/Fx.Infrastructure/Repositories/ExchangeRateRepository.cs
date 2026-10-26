using BuildingBlocks.Currencies;
using Fx.Domain.Rates;
using Microsoft.EntityFrameworkCore;

namespace Fx.Infrastructure.Repositories;

public interface IExchangeRateRepository
{
    Task<ExchangeRate?> GetLatestRateAsync(
        Currency currency,
        Currency baseCurrency,
        Guid? userId = null,
        CancellationToken cancellationToken = default);

    Task AddAsync(ExchangeRate rate, CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public sealed class ExchangeRateRepository : IExchangeRateRepository
{
    private readonly FxDbContext _context;

    public ExchangeRateRepository(FxDbContext context)
    {
        _context = context;
    }

    public async Task<ExchangeRate?> GetLatestRateAsync(
        Currency currency,
        Currency baseCurrency,
        Guid? userId = null,
        CancellationToken cancellationToken = default)
    {
        // 1. Check user manual override first if userId provided
        if (userId.HasValue)
        {
            var manualRate = await _context.ExchangeRates
                .Where(r => r.UserId == userId.Value &&
                            r.Currency == currency &&
                            r.BaseCurrency == baseCurrency)
                .OrderByDescending(r => r.FetchedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (manualRate is not null)
            {
                return manualRate;
            }
        }

        // 2. Fall back to latest market rate
        return await _context.ExchangeRates
            .Where(r => r.UserId == null &&
                        r.Currency == currency &&
                        r.BaseCurrency == baseCurrency)
            .OrderByDescending(r => r.FetchedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task AddAsync(ExchangeRate rate, CancellationToken cancellationToken = default)
    {
        await _context.ExchangeRates.AddAsync(rate, cancellationToken);
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _context.SaveChangesAsync(cancellationToken);
}
