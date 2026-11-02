using System.Data.Common;
using BuildingBlocks.Security;
using Ingestion.Infrastructure;
using Ledger.Infrastructure;
using Lending.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Planning.Infrastructure;

namespace Api.Infrastructure.Transactions;

public sealed class RelationalFinancialDataReset(
    LedgerDbContext ledgerDb,
    IngestionDbContext ingestionDb,
    LendingDbContext lendingDb,
    PlanningDbContext planningDb)
{
    private readonly DbContext[] _contexts = [ledgerDb, ingestionDb, lendingDb, planningDb];

    public async Task ExecuteAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(operation);

        var provider = ledgerDb.Database.ProviderName;
        if (provider is not ("Npgsql.EntityFrameworkCore.PostgreSQL" or "Microsoft.EntityFrameworkCore.Sqlite") ||
            _contexts.Any(context => context.Database.ProviderName != provider))
        {
            throw new InvalidOperationException("Atomic financial-data reset requires four contexts using the same PostgreSQL or SQLite provider.");
        }

        if (_contexts.Any(context => context.Database.CurrentTransaction is not null))
            throw new InvalidOperationException("Atomic financial-data reset cannot join an existing transaction.");

        var primaryConnection = ledgerDb.Database.GetDbConnection();
        var connections = _contexts.Select(context => context.Database.GetDbConnection()).ToArray();
        if (connections.Any(connection => connection.State != primaryConnection.State))
            throw new InvalidOperationException("Atomic financial-data reset requires all module connections to have the same state.");

        var replacementRequired = connections.Any(connection => !ReferenceEquals(connection, primaryConnection));
        if (replacementRequired && (provider != "Npgsql.EntityFrameworkCore.PostgreSQL" ||
            primaryConnection.State != System.Data.ConnectionState.Closed ||
            connections.Any(connection => !StringComparer.Ordinal.Equals(connection.ConnectionString, primaryConnection.ConnectionString))))
        {
            throw new InvalidOperationException("All financial modules must share one PostgreSQL connection string or the same SQLite connection for atomic reset.");
        }

        var replacedConnections = new List<(DbContext Context, DbConnection Previous)>();
        IDbContextTransaction? transaction = null;
        var enlistedContexts = new List<DbContext>();
        try
        {
            for (var i = 1; i < _contexts.Length; i++)
            {
                var context = _contexts[i];
                var connection = connections[i];
                if (ReferenceEquals(connection, primaryConnection))
                    continue;

                context.Database.SetDbConnection(primaryConnection, contextOwnsConnection: false);
                replacedConnections.Add((context, connection));
            }

            transaction = await ledgerDb.Database.BeginTransactionAsync(cancellationToken);
            for (var i = 1; i < _contexts.Length; i++)
            {
                var context = _contexts[i];
                await context.Database.UseTransactionAsync(transaction.GetDbTransaction(), cancellationToken);
                enlistedContexts.Add(context);
            }

            await operation(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            try
            {
                if (transaction is not null)
                    await transaction.RollbackAsync(CancellationToken.None);
            }
            finally
            {
                foreach (var context in _contexts)
                    context.ChangeTracker.Clear();
            }
            throw;
        }
        finally
        {
            for (var i = enlistedContexts.Count - 1; i >= 0; i--)
                await enlistedContexts[i].Database.UseTransactionAsync((DbTransaction?)null, CancellationToken.None);

            if (ledgerDb.Database.CurrentTransaction is not null)
                await ledgerDb.Database.UseTransactionAsync((DbTransaction?)null, CancellationToken.None);

            if (transaction is not null)
                await transaction.DisposeAsync();

            for (var i = replacedConnections.Count - 1; i >= 0; i--)
            {
                var replaced = replacedConnections[i];
                replaced.Context.Database.SetDbConnection(replaced.Previous, contextOwnsConnection: true);
            }
        }
    }
}
