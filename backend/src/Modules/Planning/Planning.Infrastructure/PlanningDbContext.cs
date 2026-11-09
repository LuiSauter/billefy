using BuildingBlocks.Security;
using Microsoft.EntityFrameworkCore;
using Planning.Domain.Budgets;
using Planning.Domain.Distribution;
using Planning.Domain.Goals;
using Planning.Domain.Investments;
using Planning.Domain.Recurring;

namespace Planning.Infrastructure;

public class PlanningDbContext : DbContext
{
    private readonly ICurrentUserContext _currentUserContext;

    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Investment> Investments => Set<Investment>();
    public DbSet<InvestmentTransaction> InvestmentTransactions => Set<InvestmentTransaction>();
    public DbSet<InvestmentCashLink> InvestmentCashLinks => Set<InvestmentCashLink>();
    public DbSet<DistributionPlan> DistributionPlans => Set<DistributionPlan>();
    public DbSet<RecurringPayment> RecurringPayments => Set<RecurringPayment>();

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

        // Global query filters for user_id multi-tenancy isolation (fail-closed)
        modelBuilder.Entity<Budget>().HasQueryFilter(b => _currentUserContext.IsAuthenticated && b.UserId == _currentUserContext.UserId.GetValueOrDefault());
        modelBuilder.Entity<Goal>().HasQueryFilter(g => _currentUserContext.IsAuthenticated && g.UserId == _currentUserContext.UserId.GetValueOrDefault());
        modelBuilder.Entity<Investment>().HasQueryFilter(i => _currentUserContext.IsAuthenticated && i.UserId == _currentUserContext.UserId.GetValueOrDefault());
        modelBuilder.Entity<InvestmentTransaction>().HasQueryFilter(t => _currentUserContext.IsAuthenticated && t.UserId == _currentUserContext.UserId.GetValueOrDefault());
        modelBuilder.Entity<InvestmentCashLink>().HasQueryFilter(link => _currentUserContext.IsAuthenticated && link.UserId == _currentUserContext.UserId.GetValueOrDefault());
        modelBuilder.Entity<DistributionPlan>().HasQueryFilter(p => _currentUserContext.IsAuthenticated && p.UserId == _currentUserContext.UserId.GetValueOrDefault());
        modelBuilder.Entity<RecurringPayment>().HasQueryFilter(r => _currentUserContext.IsAuthenticated && r.UserId == _currentUserContext.UserId.GetValueOrDefault());
    }
}
