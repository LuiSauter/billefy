using System.Data.Common;
using System.Linq.Expressions;
using Workspaces.Domain.Budgets;
using Workspaces.Domain.Income;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Application.Abstractions;

/// <summary>Thrown when every retry of a serializable workspace write still conflicts; the caller should ask the client to retry.</summary>
public sealed class WorkspaceWriteConflictException : Exception;

public interface IWorkspaceRepository
{
    Task<List<T>> ListAsync<T>(Expression<Func<T, bool>> predicate, CancellationToken ct) where T : class;
    Task<List<WorkspaceIncome>> ListIncomesAsync(Guid workspaceId, DateOnly? from, DateOnly? to, Guid? categoryId,
        Guid? receivedByMemberId, int limit, int offset, CancellationToken ct);
    void Add<T>(T entity) where T : class;
    void UpdateWorkspace(Workspace workspace, Workspace replacement);
    Task SetBudgetAsync(SharedBudget budget, CancellationToken ct);
    // Writes and their authorization/balance reads share a serializable transaction.
    Task<T> WriteAsync<T>(Func<Task<T>> action, CancellationToken ct);
    Task<T> WriteLedgerAsync<T>(Func<Task<T>> action, DbConnection connection, DbTransaction transaction, CancellationToken ct);
    /// <summary>Returns true when the exception is a transient PostgreSQL serialization/deadlock conflict safe to retry.</summary>
    bool IsSerializationConflict(Exception exception);
}
