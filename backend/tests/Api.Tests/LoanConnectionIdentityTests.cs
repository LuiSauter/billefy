using System.Data;
using System.Data.Common;
using Api.Infrastructure.Transactions;
using BuildingBlocks.Security;
using FluentAssertions;
using Ledger.Infrastructure;
using Lending.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Npgsql;

namespace Api.Tests;

public sealed class LoanConnectionIdentityTests
{
    private const string ConfiguredConnection =
        "Host=synthetic.invalid;Database=synthetic_loans;Username=synthetic_user;Password=synthetic_password;Persist Security Info=false";
    private const string IdentityError =
        "Lending and Ledger must use the same database connection string for atomic loan operations.";

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    [InlineData(false, false)]
    public async Task ExecuteAsync_SameConfiguredIdentity_ReachesOpeningAndRestoresConnections(
        bool redactLending, bool redactLedger)
    {
        var opening = new StopBeforeNetworkInterceptor();
        await using var lending = CreateLending(ConfiguredConnection, opening);
        await using var ledger = CreateLedger(ConfiguredConnection, opening);
        var lendingConnection = lending.Database.GetDbConnection();
        var ledgerConnection = ledger.Database.GetDbConnection();

        // Simulate Npgsql's post-open exposed string without opening a socket. These
        // are real provider connections and real UseNpgsql(string) EF options.
        if (redactLending)
            lendingConnection.ConnectionString = RedactPassword(ConfiguredConnection);
        if (redactLedger)
            ledgerConnection.ConnectionString = RedactPassword(ConfiguredConnection);

        // Verify the installed EF API retains the original independently of the
        // live connection; Database.GetConnectionString() alone cannot do this.
        lending.GetService<IDbContextOptions>().Extensions.OfType<RelationalOptionsExtension>()
            .Single().ConnectionString.Should().Be(ConfiguredConnection);
        ledger.GetService<IDbContextOptions>().Extensions.OfType<RelationalOptionsExtension>()
            .Single().ConnectionString.Should().Be(ConfiguredConnection);
        opening.BeforeOpening = connection =>
        {
            connection.Should().BeSameAs(ledgerConnection);
            lending.Database.GetDbConnection().Should().BeSameAs(ledgerConnection);
        };
        var operationCalled = false;
        var coordinator = new RelationalLoanTransaction(lending, ledger);

        var act = () => coordinator.ExecuteAsync(_ =>
        {
            operationCalled = true;
            return Task.CompletedTask;
        });

        var exception = await Record.ExceptionAsync(act);
        exception.Should().BeOfType<OpeningStoppedException>(
            "the identity guard must accept the original identity, but received: {0}", exception?.Message);
        exception!.Message.Should().Be("Synthetic stop before any network access.");
        opening.Attempts.Should().Be(1);
        operationCalled.Should().BeFalse();
        AssertRestored(lending, ledger, lendingConnection, ledgerConnection);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ExecuteAsync_DifferentConfiguredDatabases_RejectsBeforeOpeningOrSubstitution(
        bool makeLiveStringsIdentical)
    {
        var opening = new StopBeforeNetworkInterceptor();
        var otherDatabase = new NpgsqlConnectionStringBuilder(ConfiguredConnection) { Database = "synthetic_other" }.ConnectionString;
        await using var lending = CreateLending(ConfiguredConnection, opening);
        await using var ledger = CreateLedger(otherDatabase, opening);
        var lendingConnection = lending.Database.GetDbConnection();
        var ledgerConnection = ledger.Database.GetDbConnection();
        lendingConnection.ConnectionString = RedactPassword(ConfiguredConnection);
        ledgerConnection.ConnectionString = RedactPassword(makeLiveStringsIdentical ? ConfiguredConnection : otherDatabase);

        await AssertRejected(lending, ledger, opening, lendingConnection, ledgerConnection);
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public async Task ExecuteAsync_RuntimeDestinationChanged_RejectsStaleConfiguredIdentity(bool changeLending, bool changeLedger)
    {
        var opening = new StopBeforeNetworkInterceptor();
        await using var lending = CreateLending(ConfiguredConnection, opening);
        await using var ledger = CreateLedger(ConfiguredConnection, opening);
        var lendingConnection = lending.Database.GetDbConnection();
        var ledgerConnection = ledger.Database.GetDbConnection();
        var changedString = new NpgsqlConnectionStringBuilder(RedactPassword(ConfiguredConnection))
        {
            Database = "synthetic_redirected"
        }.ConnectionString;
        if (changeLending)
            lendingConnection.ConnectionString = changedString;
        if (changeLedger)
            ledgerConnection.ConnectionString = changedString;

        await AssertRejected(lending, ledger, opening, lendingConnection, ledgerConnection);
    }

    [Fact]
    public async Task ExecuteAsync_ExternallySuppliedMatchingConnections_PreservesExistingOpeningBehavior()
    {
        var opening = new StopBeforeNetworkInterceptor();
        await using var lendingConnection = new NpgsqlConnection(ConfiguredConnection);
        await using var ledgerConnection = new NpgsqlConnection(ConfiguredConnection);
        await using var lending = new LendingDbContext(new DbContextOptionsBuilder<LendingDbContext>()
            .UseNpgsql(lendingConnection).AddInterceptors(opening).Options, new SyntheticUser());
        await using var ledger = new LedgerDbContext(new DbContextOptionsBuilder<LedgerDbContext>()
            .UseNpgsql(ledgerConnection).AddInterceptors(opening).Options, new SyntheticUser());
        var coordinator = new RelationalLoanTransaction(lending, ledger);

        var act = () => coordinator.ExecuteAsync(_ => Task.CompletedTask);

        await act.Should().ThrowExactlyAsync<OpeningStoppedException>();
        opening.Attempts.Should().Be(1);
        AssertRestored(lending, ledger, lendingConnection, ledgerConnection);
    }

    private static async Task AssertRejected(LendingDbContext lending, LedgerDbContext ledger,
        StopBeforeNetworkInterceptor opening, DbConnection lendingConnection, DbConnection ledgerConnection)
    {
        var lendingString = lendingConnection.ConnectionString;
        var ledgerString = ledgerConnection.ConnectionString;
        var operationCalled = false;
        var coordinator = new RelationalLoanTransaction(lending, ledger);

        var act = () => coordinator.ExecuteAsync(_ =>
        {
            operationCalled = true;
            return Task.CompletedTask;
        });

        var thrown = await act.Should().ThrowExactlyAsync<InvalidOperationException>().WithMessage(IdentityError);
        thrown.Which.ToString().Should().NotContain("synthetic_password").And.NotContain("Password=")
            .And.NotContain("synthetic_user");
        opening.Attempts.Should().Be(0);
        operationCalled.Should().BeFalse();
        lendingConnection.ConnectionString.Should().Be(lendingString);
        ledgerConnection.ConnectionString.Should().Be(ledgerString);
        AssertRestored(lending, ledger, lendingConnection, ledgerConnection);
    }

    private static void AssertRestored(LendingDbContext lending, LedgerDbContext ledger,
        DbConnection lendingConnection, DbConnection ledgerConnection)
    {
        lending.Database.GetDbConnection().Should().BeSameAs(lendingConnection);
        ledger.Database.GetDbConnection().Should().BeSameAs(ledgerConnection);
        lendingConnection.State.Should().Be(ConnectionState.Closed);
        ledgerConnection.State.Should().Be(ConnectionState.Closed);
        lending.Database.CurrentTransaction.Should().BeNull();
        ledger.Database.CurrentTransaction.Should().BeNull();
        lending.ChangeTracker.HasChanges().Should().BeFalse();
        ledger.ChangeTracker.HasChanges().Should().BeFalse();
    }

    private static LendingDbContext CreateLending(string connectionString, DbConnectionInterceptor opening) =>
        new(new DbContextOptionsBuilder<LendingDbContext>().UseNpgsql(connectionString)
            .AddInterceptors(opening).Options, new SyntheticUser());

    private static LedgerDbContext CreateLedger(string connectionString, DbConnectionInterceptor opening) =>
        new(new DbContextOptionsBuilder<LedgerDbContext>().UseNpgsql(connectionString)
            .AddInterceptors(opening).Options, new SyntheticUser());

    private static string RedactPassword(string connectionString)
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        builder.Remove("Password");
        return builder.ConnectionString;
    }

    private sealed class SyntheticUser : ICurrentUserContext
    {
        public Guid? UserId { get; } = Guid.NewGuid();
    }

    private sealed class OpeningStoppedException() : Exception("Synthetic stop before any network access.");

    private sealed class StopBeforeNetworkInterceptor : DbConnectionInterceptor
    {
        public int Attempts { get; private set; }
        public Action<DbConnection>? BeforeOpening { get; set; }

        public override ValueTask<InterceptionResult> ConnectionOpeningAsync(DbConnection connection,
            ConnectionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
        {
            Attempts++;
            BeforeOpening?.Invoke(connection);
            throw new OpeningStoppedException();
        }

        public override InterceptionResult ConnectionOpening(DbConnection connection,
            ConnectionEventData eventData, InterceptionResult result)
        {
            Attempts++;
            throw new OpeningStoppedException();
        }
    }
}
