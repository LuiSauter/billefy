using BuildingBlocks.Security;
using Ingestion.Domain.Drafts;
using Ingestion.Domain.FinancialSources;
using Ingestion.Domain.RawEvents;
using Microsoft.EntityFrameworkCore;

namespace Ingestion.Infrastructure;

public class IngestionDbContext : DbContext
{
    private readonly ICurrentUserContext _currentUserContext;

    public DbSet<RawEvent> RawEvents => Set<RawEvent>();
    public DbSet<Draft> Drafts => Set<Draft>();
    public DbSet<DraftEvent> DraftEvents => Set<DraftEvent>();
    public DbSet<FinancialSource> FinancialSources => Set<FinancialSource>();

    public IngestionDbContext(
        DbContextOptions<IngestionDbContext> options,
        ICurrentUserContext currentUserContext)
        : base(options)
    {
        _currentUserContext = currentUserContext ?? throw new ArgumentNullException(nameof(currentUserContext));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(IngestionDbContext).Assembly);

        // Global query filters for user_id multi-tenancy isolation
        modelBuilder.Entity<RawEvent>().HasQueryFilter(e => !_currentUserContext.IsAuthenticated || e.UserId == _currentUserContext.UserId!.Value);
        modelBuilder.Entity<Draft>().HasQueryFilter(d => !_currentUserContext.IsAuthenticated || d.UserId == _currentUserContext.UserId!.Value);
        modelBuilder.Entity<FinancialSource>().HasQueryFilter(f => !_currentUserContext.IsAuthenticated || f.UserId == _currentUserContext.UserId!.Value);
    }
}
