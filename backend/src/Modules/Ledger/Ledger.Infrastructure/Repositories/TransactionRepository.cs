using Ledger.Application.Abstractions;
using Ledger.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Infrastructure.Repositories;

public sealed class TransactionRepository : ITransactionRepository
{
    private readonly LedgerDbContext _context;

    public TransactionRepository(LedgerDbContext context)
    {
        _context = context;
    }

    public async Task<Transaction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Transactions.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Transaction>> GetByAccountIdAsync(Guid accountId, CancellationToken cancellationToken = default) =>
        await _context.Transactions
            .Where(t => t.AccountId == accountId)
            .OrderByDescending(t => t.OccurredAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Transaction>> GetFilteredAsync(
        Guid? userId = null,
        Guid? accountId = null,
        TransactionDirection? direction = null,
        DateTime? from = null,
        DateTime? to = null,
        int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var query = userId.HasValue
            ? _context.Transactions.IgnoreQueryFilters().Where(t => t.UserId == userId.Value)
            : _context.Transactions.AsQueryable();

        if (accountId.HasValue)
        {
            query = query.Where(t => t.AccountId == accountId.Value);
        }

        if (direction.HasValue)
        {
            query = query.Where(t => t.Direction == direction.Value);
        }

        if (from.HasValue)
        {
            query = query.Where(t => t.OccurredAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(t => t.OccurredAt <= to.Value);
        }

        return await query
            .OrderByDescending(t => t.OccurredAt)
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync(cancellationToken);
    }

    public async Task<decimal> CalculateBalanceAsync(Guid accountId, CancellationToken cancellationToken = default)
    {
        var account = await _context.Accounts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);
        if (account is null) return 0m;

        var txns = await _context.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.AccountId == accountId && t.UserId == account.UserId)
            .Select(t => new { t.Amount.Amount, t.Direction })
            .ToListAsync(cancellationToken);

        var balance = account.InitialBalance.Amount;
        foreach (var txn in txns)
        {
            if (txn.Direction == TransactionDirection.Income) balance += txn.Amount;
            else balance -= txn.Amount;
        }

        return balance;
    }

    public async Task AddAsync(Transaction transaction, CancellationToken cancellationToken = default)
    {
        await _context.Transactions.AddAsync(transaction, cancellationToken);
    }

    public async Task AddRangeAsync(IEnumerable<Transaction> transactions, CancellationToken cancellationToken = default)
    {
        await _context.Transactions.AddRangeAsync(transactions, cancellationToken);
    }
}
