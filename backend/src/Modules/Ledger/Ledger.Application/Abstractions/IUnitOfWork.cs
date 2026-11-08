using System.Data.Common;

namespace Ledger.Application.Abstractions;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<T> ExecuteWorkspaceAtomicAsync<T>(
        Func<DbConnection, DbTransaction, CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default);
    Task<IUnitOfWorkTransaction> BeginSerializableTransactionAsync(CancellationToken cancellationToken = default);
}

public interface IUnitOfWorkTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken cancellationToken = default);
}
