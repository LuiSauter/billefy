using System.Data;
using System.Data.Common;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Workspaces.Application.Abstractions;
using Workspaces.Domain.Budgets;
using Workspaces.Domain.Expenses;
using Workspaces.Domain.Income;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure;

internal sealed class WorkspaceRepository(WorkspacesDbContext db) : IWorkspaceRepository
{
    public Task<List<T>> ListAsync<T>(Expression<Func<T, bool>> predicate, CancellationToken ct) where T : class
    {
        IQueryable<T> query = db.Set<T>();
        if (typeof(T) == typeof(WorkspaceExpense))
            query = (IQueryable<T>)db.WorkspaceExpenses.Include(x => x.Allocations);
        else if (typeof(T) == typeof(SharedBudget))
            query = (IQueryable<T>)db.SharedBudgets.Include(x => x.Categories);
        return query.Where(predicate).ToListAsync(ct);
    }

    public Task<List<WorkspaceIncome>> ListIncomesAsync(Guid workspaceId, DateOnly? from, DateOnly? to, Guid? categoryId,
        Guid? receivedByMemberId, int limit, int offset, CancellationToken ct) => db.WorkspaceIncomes
        .Where(x => x.WorkspaceId == workspaceId && (!from.HasValue || x.Date >= from.Value) &&
            (!to.HasValue || x.Date <= to.Value) && (!categoryId.HasValue || x.CategoryId == categoryId.Value) &&
            (!receivedByMemberId.HasValue || x.ReceivedByMemberId == receivedByMemberId.Value))
        .OrderByDescending(x => x.Date).ThenBy(x => x.Id).Skip(offset).Take(limit).ToListAsync(ct);

    public void Add<T>(T entity) where T : class => db.Add(entity);

    public void UpdateWorkspace(Workspace workspace, Workspace replacement) =>
        db.Entry(workspace).CurrentValues.SetValues(replacement);

    public async Task SetBudgetAsync(SharedBudget budget, CancellationToken ct)
    {
        var existing = await db.SharedBudgets.Include(x => x.Categories).SingleOrDefaultAsync(x =>
            x.WorkspaceId == budget.WorkspaceId && x.Year == budget.Year && x.Month == budget.Month, ct);
        if (existing is not null)
        {
            // Budgets are editable plans, not ledger postings. Replacement stays atomic
            // with the insert in WriteAsync and never touches expenses or settlements.
            db.SharedBudgets.Remove(existing);
            await db.SaveChangesAsync(ct);
        }
        db.SharedBudgets.Add(budget);
    }

    public async Task<T> WriteAsync<T>(Func<Task<T>> action, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var result = await action();
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    public async Task<T> WriteLedgerAsync<T>(Func<Task<T>> action, DbConnection ledgerConnection, DbTransaction ledgerTransaction, CancellationToken ct)
    {
        var provider = db.Database.ProviderName;
        if (provider is not ("Npgsql.EntityFrameworkCore.PostgreSQL" or "Microsoft.EntityFrameworkCore.Sqlite") ||
            ledgerTransaction.Connection is null || !ReferenceEquals(ledgerTransaction.Connection, ledgerConnection))
            throw new InvalidOperationException("Workspace ledger writes require an active supported local relational transaction.");
        if (db.Database.CurrentTransaction is not null)
            throw new InvalidOperationException("Workspace ledger writes cannot be nested.");

        var workspaceConnection = db.Database.GetDbConnection();
        if (workspaceConnection.State != ConnectionState.Closed && !ReferenceEquals(workspaceConnection, ledgerConnection))
            throw new InvalidOperationException("Workspace database connection must be closed before transaction enlistment.");
        if (!ReferenceEquals(workspaceConnection, ledgerConnection))
        {
            if (provider != "Npgsql.EntityFrameworkCore.PostgreSQL" ||
                !PostgresConnectionIdentity.Matches(workspaceConnection.ConnectionString, ledgerConnection.ConnectionString))
                throw new InvalidOperationException("Ledger and Workspaces must use the same PostgreSQL database for atomic writes.");
        }

        DbConnection? previousConnection = null;
        var replacedConnection = false;
        if (!ReferenceEquals(workspaceConnection, ledgerConnection))
        {
            previousConnection = workspaceConnection;
            db.Database.SetDbConnection(ledgerConnection, contextOwnsConnection: false);
            replacedConnection = true;
        }

        try
        {
            await db.Database.UseTransactionAsync(ledgerTransaction, ct);
            var result = await action();
            await db.SaveChangesAsync(ct);
            return result;
        }
        catch
        {
            db.ChangeTracker.Clear();
            throw;
        }
        finally
        {
            if (db.Database.CurrentTransaction is not null)
                await db.Database.UseTransactionAsync((DbTransaction?)null, CancellationToken.None);
            if (replacedConnection && previousConnection is not null)
                db.Database.SetDbConnection(previousConnection, contextOwnsConnection: true);
        }
    }
}

public static class PostgresConnectionIdentity
{
    public static bool Matches(string workspaceConnectionString, string ledgerConnectionString)
    {
        static string CanonicalIdentity(string connectionString)
        {
            var builder = new NpgsqlConnectionStringBuilder(connectionString);
            foreach (var key in builder.Keys.Cast<string>().ToArray())
            {
                var normalizedKey = new string(key.Where(char.IsLetterOrDigit).ToArray());
                if (normalizedKey.Equals("Password", StringComparison.OrdinalIgnoreCase) ||
                    normalizedKey.Equals("Passfile", StringComparison.OrdinalIgnoreCase) ||
                    normalizedKey.Equals("SslPassword", StringComparison.OrdinalIgnoreCase))
                    builder.Remove(key);
            }
            return builder.ConnectionString;
        }

        // Auth secrets are omitted because the shared connection is Ledger's; retain host, database,
        // principal, and all session/TLS options so configurations that differ in identity fail closed.
        return StringComparer.Ordinal.Equals(CanonicalIdentity(workspaceConnectionString),
            CanonicalIdentity(ledgerConnectionString));
    }
}
