using System.Data;
using System.Data.Common;
using Ledger.Application.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Ledger.Infrastructure.Repositories;

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly LedgerDbContext _context;

    public UnitOfWork(LedgerDbContext context)
    {
        _context = context;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _context.SaveChangesAsync(cancellationToken);

    public async Task<T> ExecuteWorkspaceAtomicAsync<T>(
        Func<DbConnection, DbTransaction, CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(operation);
        var provider = _context.Database.ProviderName;
        if (provider is not ("Npgsql.EntityFrameworkCore.PostgreSQL" or "Microsoft.EntityFrameworkCore.Sqlite"))
            throw new InvalidOperationException("Atomic workspace ledger operations require PostgreSQL or SQLite.");
        if (_context.Database.CurrentTransaction is not null)
            throw new InvalidOperationException("Atomic workspace ledger operations cannot be nested.");

        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        try
        {
            var result = await operation(_context.Database.GetDbConnection(), transaction.GetDbTransaction(), cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return result;
        }
        catch
        {
            try { await transaction.RollbackAsync(CancellationToken.None); }
            finally { _context.ChangeTracker.Clear(); }
            throw;
        }
    }

    public async Task<IUnitOfWorkTransaction> BeginSerializableTransactionAsync(CancellationToken cancellationToken = default)
    {
        var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        return new UnitOfWorkTransaction(transaction);
    }

    private sealed class UnitOfWorkTransaction(IDbContextTransaction transaction) : IUnitOfWorkTransaction
    {
        public Task CommitAsync(CancellationToken cancellationToken = default) => transaction.CommitAsync(cancellationToken);

        public ValueTask DisposeAsync() => transaction.DisposeAsync();
    }
}
