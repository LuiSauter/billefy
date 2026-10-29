using BuildingBlocks.Security;
using BuildingBlocks.ValueObjects;
using Ledger.Domain.Accounts;
using Ledger.Domain.Categories;
using Ledger.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Infrastructure;

public class LedgerDbContext : DbContext
{
    private readonly ICurrentUserContext _currentUserContext;

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();

    public LedgerDbContext(DbContextOptions<LedgerDbContext> options, ICurrentUserContext currentUserContext)
        : base(options)
    {
        _currentUserContext = currentUserContext ?? throw new ArgumentNullException(nameof(currentUserContext));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LedgerDbContext).Assembly);

        // Global query filters for multi-tenant isolation by user_id (fail-closed)
        modelBuilder.Entity<Account>().HasQueryFilter(a => _currentUserContext.IsAuthenticated && a.UserId == _currentUserContext.UserId.GetValueOrDefault());
        modelBuilder.Entity<Category>().HasQueryFilter(c => _currentUserContext.IsAuthenticated && c.UserId == _currentUserContext.UserId.GetValueOrDefault());
        modelBuilder.Entity<Transaction>().HasQueryFilter(t => _currentUserContext.IsAuthenticated && t.UserId == _currentUserContext.UserId.GetValueOrDefault());
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        EnforceTransactionImmutability();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        EnforceTransactionImmutability();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void EnforceTransactionImmutability()
    {
        var mutatedTransactions = ChangeTracker.Entries<Transaction>()
            .Where(e => e.State is EntityState.Modified or EntityState.Deleted)
            .ToList();

        if (mutatedTransactions.Count > 0)
        {
            throw new InvalidOperationException("Transactions in the Ledger are immutable and cannot be updated or deleted. Use reversal transactions instead (Rule 6).");
        }
    }

    /// <summary>
    /// Calculates the derived balance of an account as:
    /// balance = initial_balance + sum(income) - sum(expense)
    /// </summary>
    public async Task<Money> CalculateAccountBalanceAsync(Guid accountId, CancellationToken cancellationToken = default)
    {
        var account = await Accounts.FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken)
            ?? throw new InvalidOperationException($"Account {accountId} not found.");

        var transactions = await Transactions
            .Where(t => t.AccountId == accountId)
            .Select(t => new { t.Amount.Amount, t.Direction })
            .ToListAsync(cancellationToken);

        var balanceAmount = account.InitialBalance.Amount;

        foreach (var txn in transactions)
        {
            if (txn.Direction == TransactionDirection.Income)
            {
                balanceAmount += txn.Amount;
            }
            else
            {
                balanceAmount -= txn.Amount;
            }
        }

        return Money.Of(balanceAmount, account.Currency);
    }
}
