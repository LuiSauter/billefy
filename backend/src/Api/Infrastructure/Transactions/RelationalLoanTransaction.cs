using Lending.Application.Abstractions;
using Lending.Infrastructure;
using Ledger.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.Data.Common;

namespace Api.Infrastructure.Transactions;

public sealed class RelationalLoanTransaction(
    LendingDbContext lendingDb,
    LedgerDbContext ledgerDb) : ILoanTransaction
{
    public async Task ExecuteAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(operation);

        var lendingProvider = lendingDb.Database.ProviderName;
        if (lendingProvider != ledgerDb.Database.ProviderName ||
            lendingProvider is not ("Npgsql.EntityFrameworkCore.PostgreSQL" or "Microsoft.EntityFrameworkCore.Sqlite"))
        {
            throw new InvalidOperationException("Atomic loan operations require matching PostgreSQL or SQLite relational providers.");
        }

        var lendingConnection = lendingDb.Database.GetDbConnection();
        var ledgerConnection = ledgerDb.Database.GetDbConnection();

        if (lendingDb.Database.CurrentTransaction is not null ||
            ledgerDb.Database.CurrentTransaction is not null)
        {
            throw new InvalidOperationException("Atomic loan operations require closed connections without active transactions.");
        }

        if (lendingConnection.State != System.Data.ConnectionState.Closed)
        {
            await lendingDb.Database.CloseConnectionAsync();
        }

        if (ledgerConnection.State != System.Data.ConnectionState.Closed)
        {
            await ledgerDb.Database.CloseConnectionAsync();
        }

        DbConnection? previousLendingConnection = null;
        var lendingConnectionReplaced = false;
        if (!ReferenceEquals(lendingConnection, ledgerConnection))
        {
            if (lendingProvider != "Npgsql.EntityFrameworkCore.PostgreSQL" ||
                !StringComparer.Ordinal.Equals(lendingConnection.ConnectionString, ledgerConnection.ConnectionString))
            {
                throw new InvalidOperationException("Lending and Ledger must use the same database connection string for atomic loan operations.");
            }

            previousLendingConnection = lendingConnection;
            lendingDb.Database.SetDbConnection(ledgerConnection, contextOwnsConnection: false);
            lendingConnectionReplaced = true;
        }

        IDbContextTransaction? ledgerTransaction = null;
        try
        {
            ledgerTransaction = await ledgerDb.Database.BeginTransactionAsync(cancellationToken);
            await lendingDb.Database.UseTransactionAsync(ledgerTransaction.GetDbTransaction(), cancellationToken);

            await operation(cancellationToken);
            await ledgerTransaction.CommitAsync(cancellationToken);
        }
        catch
        {
            try
            {
                if (ledgerTransaction is not null)
                {
                    await ledgerTransaction.RollbackAsync(CancellationToken.None);
                }
            }
            finally
            {
                // EF retains Modified/Added states after a database rollback. The request-scoped contexts
                // must not accidentally re-save those failed financial changes on a later operation.
                lendingDb.ChangeTracker.Clear();
                ledgerDb.ChangeTracker.Clear();
            }
            throw;
        }
        finally
        {
            if (lendingDb.Database.CurrentTransaction is not null)
            {
                await lendingDb.Database.UseTransactionAsync((DbTransaction?)null, CancellationToken.None);
            }

            if (ledgerDb.Database.CurrentTransaction is not null)
            {
                await ledgerDb.Database.UseTransactionAsync((DbTransaction?)null, CancellationToken.None);
            }

            if (ledgerTransaction is not null)
            {
                await ledgerTransaction.DisposeAsync();
            }

            if (lendingConnectionReplaced && previousLendingConnection is not null)
            {
                lendingDb.Database.SetDbConnection(previousLendingConnection, contextOwnsConnection: true);
            }
        }
    }
}
