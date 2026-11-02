using Fx.Domain.Currencies;
using Fx.Domain.Rates;
using Microsoft.EntityFrameworkCore;

namespace Fx.Infrastructure;

public class FxDbContext : DbContext
{
    public DbSet<ExchangeRate> ExchangeRates => Set<ExchangeRate>();
    public DbSet<CurrencyCatalogEntry> CurrencyCatalogEntries => Set<CurrencyCatalogEntry>();

    public FxDbContext(DbContextOptions<FxDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(FxDbContext).Assembly);
    }
}
