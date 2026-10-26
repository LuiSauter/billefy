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

    public async Task AddAsync(Transaction transaction, CancellationToken cancellationToken = default)
    {
        await _context.Transactions.AddAsync(transaction, cancellationToken);
    }

    public async Task AddRangeAsync(IEnumerable<Transaction> transactions, CancellationToken cancellationToken = default)
    {
        await _context.Transactions.AddRangeAsync(transactions, cancellationToken);
    }
}
