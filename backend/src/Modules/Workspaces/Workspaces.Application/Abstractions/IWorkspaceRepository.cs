using System.Data.Common;
using System.Linq.Expressions;
using Workspaces.Domain.Budgets;
using Workspaces.Domain.Income;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Application.Abstractions;

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
}
