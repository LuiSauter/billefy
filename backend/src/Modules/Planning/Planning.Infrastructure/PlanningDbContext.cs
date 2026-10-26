using BuildingBlocks.Security;
using Microsoft.EntityFrameworkCore;
using Planning.Domain.Budgets;
using Planning.Domain.Goals;

namespace Planning.Infrastructure;

public class PlanningDbContext : DbContext
{
    private readonly ICurrentUserContext _currentUserContext;

    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Goal> Goals => Set<Goal>();

    public PlanningDbContext(
        DbContextOptions<PlanningDbContext> options,
        ICurrentUserContext currentUserContext)
        : base(options)
    {
        _currentUserContext = currentUserContext ?? throw new ArgumentNullException(nameof(currentUserContext));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PlanningDbContext).Assembly);

        // Global query filters for user_id multi-tenancy isolation
        modelBuilder.Entity<Budget>().HasQueryFilter(b => !_currentUserContext.IsAuthenticated || b.UserId == _currentUserContext.UserId!.Value);
        modelBuilder.Entity<Goal>().HasQueryFilter(g => !_currentUserContext.IsAuthenticated || g.UserId == _currentUserContext.UserId!.Value);
    }
}
