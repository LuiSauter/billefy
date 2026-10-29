using BuildingBlocks.Security;
using Lending.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Lending.Infrastructure;

public class LendingDbContext : DbContext
{
    private readonly ICurrentUserContext _currentUserContext;

    public DbSet<Loan> Loans => Set<Loan>();
    public DbSet<LoanInstallment> Installments => Set<LoanInstallment>();
    public DbSet<LoanPayment> Payments => Set<LoanPayment>();
    public DbSet<PaymentAllocation> PaymentAllocations => Set<PaymentAllocation>();
    public DbSet<Counterparty> Counterparties => Set<Counterparty>();

    public LendingDbContext(
        DbContextOptions<LendingDbContext> options,
        ICurrentUserContext currentUserContext)
        : base(options)
    {
        _currentUserContext = currentUserContext ?? throw new ArgumentNullException(nameof(currentUserContext));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LendingDbContext).Assembly);

        // Global query filters for user_id multi-tenancy isolation (fail-closed)
        modelBuilder.Entity<Loan>().HasQueryFilter(l => _currentUserContext.IsAuthenticated && l.UserId == _currentUserContext.UserId.GetValueOrDefault());
        modelBuilder.Entity<Counterparty>().HasQueryFilter(c => _currentUserContext.IsAuthenticated && c.UserId == _currentUserContext.UserId.GetValueOrDefault());
        modelBuilder.Entity<LoanPayment>().HasQueryFilter(p => _currentUserContext.IsAuthenticated && p.UserId == _currentUserContext.UserId.GetValueOrDefault());
    }
}
