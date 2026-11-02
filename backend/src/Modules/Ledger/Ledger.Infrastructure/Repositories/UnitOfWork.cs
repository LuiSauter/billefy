using System.Data;
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
