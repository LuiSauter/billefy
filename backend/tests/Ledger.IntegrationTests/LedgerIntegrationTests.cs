using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Ledger.Application.Accounts.CreateAccount;
using Ledger.Application.Transactions.RegisterTransaction;
using Ledger.Application.Transactions.ReverseTransaction;
using Ledger.Domain.Accounts;
using Ledger.Domain.Transactions;
using Ledger.Infrastructure;
using Ledger.Infrastructure.Repositories;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Ledger.IntegrationTests;

public class LedgerIntegrationTests
{
    private class TestUserContext : ICurrentUserContext
    {
        public Guid? UserId { get; set; } = Guid.NewGuid();
    }

    private class TestClock : IClock
    {
        public DateTime UtcNow { get; set; } = new(2026, 10, 26, 15, 0, 0, DateTimeKind.Utc);
        public DateOnly TodayUtc => DateOnly.FromDateTime(UtcNow);
    }

    private (LedgerDbContext Context, SqliteConnection Connection) CreateDbContext(TestUserContext userContext)
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        var options = new DbContextOptionsBuilder<LedgerDbContext>()
            .UseSqlite(connection)
            .Options;

        var context = new LedgerDbContext(options, userContext);
        context.Database.EnsureCreated();

        return (context, connection);
    }

    [Fact]
    public async Task ImmutabilityGuard_ModifyingTransaction_ThrowsInvalidOperationException()
    {
        var userContext = new TestUserContext();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;

        var account = Account.Create(userContext.UserId!.Value, "Cash", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        var transaction = Transaction.Create(userContext.UserId!.Value, account.Id, Money.Of(100m, Currency.BOB), TransactionDirection.Expense, null, DateTime.UtcNow, "Lunch");

        await context.Accounts.AddAsync(account);
        await context.Transactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        // Attempting to modify transaction description or state in EF Core change tracker
        context.Entry(transaction).Property(t => t.Description).CurrentValue = "Hacked Lunch";

        var act = async () => await context.SaveChangesAsync();

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*immutable and cannot be updated or deleted*");
    }

    [Fact]
    public async Task ImmutabilityGuard_DeletingTransaction_ThrowsInvalidOperationException()
    {
        var userContext = new TestUserContext();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;

        var account = Account.Create(userContext.UserId!.Value, "Cash", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        var transaction = Transaction.Create(userContext.UserId!.Value, account.Id, Money.Of(50m, Currency.BOB), TransactionDirection.Expense, null, DateTime.UtcNow, "Coffee");

        await context.Accounts.AddAsync(account);
        await context.Transactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        // Attempting to delete transaction row
        context.Transactions.Remove(transaction);

        var act = async () => await context.SaveChangesAsync();

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*immutable and cannot be updated or deleted*");
    }

    [Fact]
    public async Task DerivedBalance_WithInitialBalance_Transactions_AndReversals()
    {
        var userContext = new TestUserContext();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;

        // Initial balance = 1000 BOB
        var initial = Money.Of(1000m, Currency.BOB);
        var account = Account.Create(userContext.UserId!.Value, "Savings", AccountType.Bank, Currency.BOB, initial, DateTime.UtcNow);
        await context.Accounts.AddAsync(account);

        // +500 BOB income -> balance 1500
        var t1 = Transaction.Create(userContext.UserId!.Value, account.Id, Money.Of(500m, Currency.BOB), TransactionDirection.Income, null, DateTime.UtcNow, "Salary");
        await context.Transactions.AddAsync(t1);

        // -200 BOB expense -> balance 1300
        var t2 = Transaction.Create(userContext.UserId!.Value, account.Id, Money.Of(200m, Currency.BOB), TransactionDirection.Expense, null, DateTime.UtcNow, "Mistaken expense");
        await context.Transactions.AddAsync(t2);

        // Reversal of t2 (adds 200 BOB back via income reversal) -> balance 1500
        var t3 = Transaction.CreateReversal(t2, DateTime.UtcNow, "Refund/correction");
        await context.Transactions.AddAsync(t3);

        await context.SaveChangesAsync();

        var balance = await context.CalculateAccountBalanceAsync(account.Id);

        balance.Amount.Should().Be(1500.00m);
        balance.Currency.Should().Be(Currency.BOB);
    }

    [Fact]
    public async Task MultiTenantIsolation_UserCannotQueryAnotherUsersData()
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();
        using var _ = connection;

        var options = new DbContextOptionsBuilder<LedgerDbContext>()
            .UseSqlite(connection)
            .Options;

        var userA = new TestUserContext { UserId = Guid.NewGuid() };
        var userB = new TestUserContext { UserId = Guid.NewGuid() };

        // User A creates an account
        using (var contextA = new LedgerDbContext(options, userA))
        {
            contextA.Database.EnsureCreated();
            var accountA = Account.Create(userA.UserId!.Value, "User A Account", AccountType.Bank, Currency.USD, Money.Zero(Currency.USD), DateTime.UtcNow);
            await contextA.Accounts.AddAsync(accountA);
            await contextA.SaveChangesAsync();
        }

        // User B reads accounts through shared database
        using (var contextB = new LedgerDbContext(options, userB))
        {
            var userBAccounts = await contextB.Accounts.ToListAsync();
            userBAccounts.Should().BeEmpty("Global query filter must prevent User B from reading User A's accounts.");
        }
    }

    [Fact]
    public async Task ApplicationHandlers_EndToEnd_CreateAccount_RegisterTxn_And_Reverse()
    {
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;

        var accountRepo = new AccountRepository(context);
        var txnRepo = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);

        // 1. Create Account use case
        var createAccountHandler = new CreateAccountCommandHandler(accountRepo, userContext, clock, unitOfWork);
        var createResult = await createAccountHandler.HandleAsync(new CreateAccountCommand("Billetera", AccountType.Wallet, "BOB", 100m));

        createResult.IsSuccess.Should().BeTrue();
        var accountId = createResult.Value;

        // 2. Register Expense use case
        var registerHandler = new RegisterTransactionCommandHandler(accountRepo, txnRepo, userContext, clock, unitOfWork);
        var txnResult = await registerHandler.HandleAsync(new RegisterTransactionCommand(
            accountId,
            40m,
            TransactionDirection.Expense,
            null,
            clock.UtcNow,
            "Almuerzo",
            AppliedRate: 11.96m,
            RateSource: "DolarApi"));

        txnResult.IsSuccess.Should().BeTrue();
        var txnId = txnResult.Value;

        var balanceAfterExpense = await context.CalculateAccountBalanceAsync(accountId);
        balanceAfterExpense.Amount.Should().Be(60.00m); // 100 - 40

        // 3. Reverse Expense use case
        var reverseHandler = new ReverseTransactionCommandHandler(txnRepo, userContext, clock, unitOfWork);
        var revResult = await reverseHandler.HandleAsync(new ReverseTransactionCommand(txnId, "Cobro erróneo"));

        revResult.IsSuccess.Should().BeTrue();

        var finalBalance = await context.CalculateAccountBalanceAsync(accountId);
        finalBalance.Amount.Should().Be(100.00m); // Restored to 100.00 without deleting original row!

        var allTxns = await txnRepo.GetByAccountIdAsync(accountId);
        allTxns.Should().HaveCount(2, "Original transaction and reversal both remain permanently in ledger.");
    }

    [Fact]
    public async Task RegisterTransaction_WithoutExplicitRate_ShouldCaptureSnapshotFromFxContracts()
    {
        var dbName = Guid.NewGuid().ToString();
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;

        var accountRepo = new AccountRepository(context);
        var txnRepo = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);

        // Mock IRateSnapshotProvider
        var snapshotProvider = new MockSnapshotProvider(new Fx.Contracts.RateSnapshotDto(12.00m, "DolarApi:BinanceP2P", clock.UtcNow, false));

        var createAccountHandler = new CreateAccountCommandHandler(accountRepo, userContext, clock, unitOfWork);
        var createResult = await createAccountHandler.HandleAsync(new CreateAccountCommand("Banco", AccountType.Bank, "BOB", 100m));
        var accountId = createResult.Value;

        var registerHandler = new RegisterTransactionCommandHandler(accountRepo, txnRepo, userContext, clock, unitOfWork, snapshotProvider);
        var txnResult = await registerHandler.HandleAsync(new RegisterTransactionCommand(
            accountId,
            50m,
            TransactionDirection.Expense,
            null,
            clock.UtcNow,
            "Alquiler"));

        txnResult.IsSuccess.Should().BeTrue();
        var txn = await txnRepo.GetByIdAsync(txnResult.Value);

        txn.Should().NotBeNull();
        txn!.AppliedRate.Should().Be(12.00m);
        txn.RateSource.Should().Be("DolarApi:BinanceP2P");
    }

    private class MockSnapshotProvider : Fx.Contracts.IRateSnapshotProvider
    {
        private readonly Fx.Contracts.RateSnapshotDto _dto;
        public MockSnapshotProvider(Fx.Contracts.RateSnapshotDto dto) => _dto = dto;

        public Task<Fx.Contracts.RateSnapshotDto?> GetSnapshotAsync(string currencyCode, string baseCurrencyCode, Guid? userId = null, CancellationToken cancellationToken = default) =>
            Task.FromResult<Fx.Contracts.RateSnapshotDto?>(_dto);
    }
}
