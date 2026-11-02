using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Fx.Contracts;
using Ledger.Application.Accounts.CreateAccount;
using Ledger.Application.Abstractions;
using Ledger.Application.Transactions.RegisterTransaction;
using Ledger.Application.Transactions.RegisterTransfer;
using Ledger.Application.Transactions.Services;
using Ledger.Application.Transactions.ReverseTransaction;
using Ledger.Domain.Accounts;
using Ledger.Domain.Categories;
using Ledger.Domain.Transactions;
using Ledger.Infrastructure;
using Ledger.Infrastructure.Repositories;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace Ledger.IntegrationTests;

public class LedgerIntegrationTests
{
    private class TestUserContext : ICurrentUserContext
    {
        public Guid? UserId { get; set; } = Guid.NewGuid();
    }

    private sealed class TestCurrencyCatalog : ICurrencyCatalog
    {
        private static readonly string[] ActiveCodes = ["BOB", "USD", "USDT"];

        public Task<IReadOnlyList<CurrencyCatalogEntryDto>> GetActiveCurrenciesAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<CurrencyCatalogEntryDto>>(
                ActiveCodes.Select(code => new CurrencyCatalogEntryDto(code, code, code, 2, true)).ToArray());

        public Task<bool> IsActiveAsync(string code, CancellationToken cancellationToken = default) =>
            Task.FromResult(ActiveCodes.Contains(code, StringComparer.OrdinalIgnoreCase));
    }

    private class TestClock : IClock
    {
        public DateTime UtcNow { get; set; } = new(2026, 10, 26, 15, 0, 0, DateTimeKind.Utc);
        public DateOnly TodayUtc => DateOnly.FromDateTime(UtcNow);
    }

    private (LedgerDbContext Context, SqliteConnection Connection) CreateDbContext(TestUserContext userContext, IMaterializationInterceptor? materializationInterceptor = null)
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        var optionsBuilder = new DbContextOptionsBuilder<LedgerDbContext>().UseSqlite(connection);
        if (materializationInterceptor is not null) optionsBuilder.AddInterceptors(materializationInterceptor);
        var options = optionsBuilder.Options;

        var context = new LedgerDbContext(options, userContext);
        context.Database.EnsureCreated();

        return (context, connection);
    }

    [Fact]
    public async Task CreateAccount_RequiresActiveCatalogCurrency()
    {
        var userContext = new TestUserContext();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var handler = new CreateAccountCommandHandler(
            new AccountRepository(context), userContext, new TestClock(), new UnitOfWork(context), new TestCurrencyCatalog());

        var unsupported = await handler.HandleAsync(new CreateAccountCommand("Unsupported", AccountType.Wallet, "EUR"));
        unsupported.IsFailure.Should().BeTrue();

        var supported = await handler.HandleAsync(new CreateAccountCommand("Supported", AccountType.Wallet, "USDT"));
        supported.IsSuccess.Should().BeTrue();
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
    public async Task TransactionAllocations_PersistAreLoadedAndCannotBeChangedOrDeleted()
    {
        var userContext = new TestUserContext();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var account = Account.Create(userContext.UserId!.Value, "Cash", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        var category = Category.Create(userContext.UserId.Value, "Dining", null, "Expense|utensils|rose", DateTime.UtcNow);
        var transaction = Transaction.Create(userContext.UserId.Value, account.Id, Money.Of(12m, Currency.BOB), TransactionDirection.Expense,
            null, DateTime.UtcNow, "Split", allocations: [new(category.Id, 12m)]);
        await context.Accounts.AddAsync(account);
        await context.Categories.AddAsync(category);
        await context.Transactions.AddAsync(transaction);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var repository = new TransactionRepository(context);
        var loaded = await repository.GetByIdAsync(transaction.Id);
        loaded!.CategoryAllocations.Should().ContainSingle().Which.Amount.Should().Be(12m);
        var filtered = await repository.GetFilteredAsync(userContext.UserId, account.Id);
        filtered.Should().ContainSingle().Which.CategoryAllocations.Should().ContainSingle();
        context.ChangeTracker.Clear();
        userContext.UserId = Guid.NewGuid();
        (await context.TransactionCategoryAllocations.CountAsync()).Should().Be(0);
        userContext.UserId = transaction.UserId;

        var reversal = Transaction.CreateReversal(loaded, DateTime.UtcNow.AddMinutes(1));
        await context.Transactions.AddAsync(reversal);
        await context.SaveChangesAsync();
        var loadedReversal = await repository.GetByIdAsync(reversal.Id);
        loadedReversal!.CategoryAllocations.Should().ContainSingle();
        loadedReversal.CategoryAllocations.Single().Id.Should().NotBe(loaded.CategoryAllocations.Single().Id);
        (await repository.CalculateBalanceAsync(account.Id)).Should().Be(0m);

        context.ChangeTracker.Clear();
        loaded = await repository.GetByIdAsync(transaction.Id);
        var allocation = loaded!.CategoryAllocations.Single();
        context.Entry(allocation).Property(item => item.Amount).CurrentValue = 11m;
        var modify = async () => await context.SaveChangesAsync();
        await modify.Should().ThrowAsync<InvalidOperationException>().WithMessage("*allocations are immutable*");
        context.Entry(allocation).State = EntityState.Unchanged;
        context.Remove(allocation);
        var delete = async () => await context.SaveChangesAsync();
        await delete.Should().ThrowAsync<InvalidOperationException>().WithMessage("*allocations are immutable*");
    }

    [Fact]
    public async Task MonthlySpendingAggregatesActiveAllocationsByCurrencyAndOwnerInDatabase()
    {
        var userContext = new TestUserContext();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var ownerId = userContext.UserId!.Value;
        var otherOwnerId = Guid.NewGuid();
        var start = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1);
        var bob = Account.Create(ownerId, "BOB", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), start);
        var usd = Account.Create(ownerId, "USD", AccountType.Cash, Currency.USD, Money.Zero(Currency.USD), start);
        var foreignAccount = Account.Create(otherOwnerId, "Other", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), start);
        var food = Category.Create(ownerId, "Food", null, null, start);
        var travel = Category.Create(ownerId, "Travel", null, null, start);
        var foreignCategory = Category.Create(otherOwnerId, "Foreign", null, null, start);
        var old = Transaction.Create(ownerId, bob.Id, Money.Of(100m, Currency.BOB), TransactionDirection.Expense,
            null, start.AddDays(4), "Original", allocations: [new(food.Id, 60m), new(travel.Id, 40m)]);
        var replacement = Transaction.Create(ownerId, bob.Id, Money.Of(100m, Currency.BOB), TransactionDirection.Expense,
            null, start.AddDays(5), "Replacement", allocations: [new(food.Id, 30m), new(travel.Id, 70m)]);
        var reversalOutsideMonth = Transaction.CreateReversal(old, end.AddDays(1));
        var legacy = Transaction.Create(ownerId, bob.Id, Money.Of(7m, Currency.BOB), TransactionDirection.Expense,
            food.Id, start.AddDays(6), "Legacy category");
        var usdExpense = Transaction.Create(ownerId, usd.Id, Money.Of(25m, Currency.USD), TransactionDirection.Expense,
            food.Id, start.AddDays(7), "USD category");
        var transfer = Transaction.CreateTransfer(ownerId, bob.Id, Money.Of(10m, Currency.BOB), usd.Id,
            Money.Of(10m, Currency.USD), start.AddDays(8), 1m, "Manual", "Internal transfer");
        var foreignExpense = Transaction.Create(otherOwnerId, foreignAccount.Id, Money.Of(999m, Currency.BOB),
            TransactionDirection.Expense, foreignCategory.Id, start.AddDays(9), "Foreign expense");
        await context.Accounts.AddRangeAsync(bob, usd, foreignAccount);
        await context.Categories.AddRangeAsync(food, travel, foreignCategory);
        await context.Transactions.AddRangeAsync(old, replacement, reversalOutsideMonth, legacy, usdExpense,
            transfer.Outflow, transfer.Inflow, foreignExpense);
        await context.SaveChangesAsync();

        var repository = new TransactionRepository(context);
        var categoryExpenses = await repository.GetMonthlyCategoryExpensesAsync(ownerId, start, end);
        categoryExpenses.Where(item => item.Currency == "BOB").ToDictionary(item => item.CategoryId, item => item.Amount)
            .Should().BeEquivalentTo(new Dictionary<Guid, decimal> { [food.Id] = 37m, [travel.Id] = 70m });
        categoryExpenses.Where(item => item.Currency == "USD").ToDictionary(item => item.CategoryId, item => item.Amount)
            .Should().BeEquivalentTo(new Dictionary<Guid, decimal> { [food.Id] = 25m });

        var totals = await repository.GetMonthlyActivityByCurrencyAsync(ownerId, start, end);
        totals.Should().BeEquivalentTo(new[]
        {
            new MonthlyTransactionCurrencyTotal("BOB", 0m, 107m),
            new MonthlyTransactionCurrencyTotal("USD", 0m, 25m)
        });
    }

    [Fact]
    public async Task AllocationForeignKeys_RejectCategoryOwnedByAnotherUser()
    {
        var userContext = new TestUserContext();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var ownerId = userContext.UserId!.Value;
        var foreignOwnerId = Guid.NewGuid();
        var account = Account.Create(ownerId, "Cash", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        var parentCategory = Category.Create(ownerId, "Parent category", null, null, DateTime.UtcNow);
        var foreignCategory = Category.Create(foreignOwnerId, "Foreign category", null, null, DateTime.UtcNow);
        var transaction = Transaction.Create(ownerId, account.Id, Money.Of(5m, Currency.BOB), TransactionDirection.Expense, null,
            DateTime.UtcNow, "Parent");
        await context.Accounts.AddAsync(account);
        await context.Categories.AddRangeAsync(parentCategory, foreignCategory);
        await context.Transactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        context.TransactionCategoryAllocations.Add(TransactionCategoryAllocation.Create(ownerId, transaction.Id, foreignCategory.Id, 5m));
        var act = async () => await context.SaveChangesAsync();
        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task AllocationForeignKeys_RejectForgedOwnerDifferentFromParent()
    {
        var userContext = new TestUserContext();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var ownerId = userContext.UserId!.Value;
        var forgedOwnerId = Guid.NewGuid();
        var account = Account.Create(ownerId, "Cash", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        var category = Category.Create(ownerId, "Owned category", null, null, DateTime.UtcNow);
        var transaction = Transaction.Create(ownerId, account.Id, Money.Of(5m, Currency.BOB), TransactionDirection.Expense, null,
            DateTime.UtcNow, "Parent");
        await context.Accounts.AddAsync(account);
        await context.Categories.AddAsync(category);
        await context.Transactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        context.TransactionCategoryAllocations.Add(TransactionCategoryAllocation.Create(forgedOwnerId, transaction.Id, category.Id, 5m));
        var act = async () => await context.SaveChangesAsync();
        await act.Should().ThrowAsync<DbUpdateException>();
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
        var createAccountHandler = new CreateAccountCommandHandler(accountRepo, userContext, clock, unitOfWork, new TestCurrencyCatalog());
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

        var createAccountHandler = new CreateAccountCommandHandler(accountRepo, userContext, clock, unitOfWork, new TestCurrencyCatalog());
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

    [Fact]
    public async Task TransferRegistration_RequiresManualUsdSellRateWhenProviderCannotExposeIt()
    {
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var accounts = new AccountRepository(context);
        var transactions = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);
        var usd = Account.Create(userContext.UserId!.Value, "USD", AccountType.Bank, Currency.USD, Money.Zero(Currency.USD), clock.UtcNow);
        var bob = Account.Create(userContext.UserId.Value, "BOB", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        await context.Accounts.AddRangeAsync(usd, bob);
        await context.SaveChangesAsync();
        var provider = new RecordingSnapshotProvider((_, _) => null);
        var handler = new RegisterTransferCommandHandler(accounts, transactions, userContext, clock, unitOfWork, provider);

        var marketAttempt = await handler.HandleAsync(new(usd.Id, 10m, bob.Id, 120m, clock.UtcNow, null, null, "Market"));
        marketAttempt.IsFailure.Should().BeTrue();
        marketAttempt.Error.Code.Should().Be("Transfer.SellRateUnavailable");
        provider.SideRequests.Should().ContainSingle().Which.Should().Be(("BOB", "USD", Fx.Contracts.RateSide.Sell, userContext.UserId));
        var manualAttempt = await handler.HandleAsync(new(usd.Id, 10m, bob.Id, 120m, clock.UtcNow, 12m, "Manual", "Negotiated"));
        manualAttempt.IsSuccess.Should().BeTrue();
        var saved = await transactions.GetByIdAsync(manualAttempt.Value.OutflowId);
        saved!.AppliedRate.Should().Be(12m);
        saved.RateSource.Should().Be("Manual");
        var manualSnapshotProvider = new RecordingSnapshotProvider((currency, baseCurrency) =>
            currency == "BOB" && baseCurrency == "USD"
                ? new Fx.Contracts.RateSnapshotDto(11.5m, "Manual", clock.UtcNow, false)
                : null);
        var snapshotAttempt = await new RegisterTransferCommandHandler(accounts, transactions, userContext, clock, unitOfWork, manualSnapshotProvider)
            .HandleAsync(new(usd.Id, 10m, bob.Id, 115m, clock.UtcNow, null, null, "Manual snapshot"));
        snapshotAttempt.IsSuccess.Should().BeTrue();
        manualSnapshotProvider.SideRequests.Should().ContainSingle().Which.Should().Be(("BOB", "USD", Fx.Contracts.RateSide.Sell, userContext.UserId));
        (await transactions.GetByIdAsync(snapshotAttempt.Value.OutflowId))!.RateSource.Should().Be("Manual");
    }

    [Fact]
    public async Task TransferRegistration_UsesTheSellSideForUsdToBobMarketTransfers()
    {
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var accounts = new AccountRepository(context);
        var transactions = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);
        var usd = Account.Create(userContext.UserId!.Value, "USD", AccountType.Bank, Currency.USD, Money.Of(100m, Currency.USD), clock.UtcNow);
        var bob = Account.Create(userContext.UserId.Value, "BOB", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        await context.Accounts.AddRangeAsync(usd, bob);
        await context.SaveChangesAsync();
        var provider = new RecordingSnapshotProvider((_, _) =>
            new Fx.Contracts.RateSnapshotDto(11.5m, "DolarApi:BinanceP2P", clock.UtcNow, false));
        var handler = new RegisterTransferCommandHandler(accounts, transactions, userContext, clock, unitOfWork, provider);

        var mismatched = await handler.HandleAsync(new(usd.Id, 10m, bob.Id, 114m, clock.UtcNow, null, null, "Wrong destination"));
        mismatched.IsFailure.Should().BeTrue();
        mismatched.Error.Code.Should().Be("Transfer.RateAmountMismatch");
        (await transactions.GetByAccountIdAsync(usd.Id)).Should().BeEmpty();
        (await transactions.GetByAccountIdAsync(bob.Id)).Should().BeEmpty();

        var created = await handler.HandleAsync(new(usd.Id, 10m, bob.Id, 115m, clock.UtcNow, null, null, "USD sale"));

        created.IsSuccess.Should().BeTrue();
        var outflow = await transactions.GetByIdAsync(created.Value.OutflowId);
        var inflow = await transactions.GetByIdAsync(created.Value.InflowId);
        outflow!.AppliedRate.Should().Be(11.5m);
        inflow!.AppliedRate.Should().Be(11.5m);
        outflow.RateSource.Should().Be("DolarApi:BinanceP2P");
        provider.SideRequests.Should().HaveCount(2);
        provider.SideRequests.Should().OnlyContain(request => request.Side == Fx.Contracts.RateSide.Sell);

        var service = new TransactionService(transactions, null!, handler, null!, userContext, clock, accounts, unitOfWork);
        var corrected = await service.CorrectTransferAsync(outflow.TransferId!.Value,
            new CorrectTransferRequest(usd.Id, 20m, bob.Id, 230m, Description: "Corrected USD sale"));
        corrected.IsSuccess.Should().BeTrue();
        var replacement = await transactions.GetByIdAsync(corrected.Value.OutflowId);
        replacement!.AppliedRate.Should().Be(11.5m);
        replacement.RateSource.Should().Be("DolarApi:BinanceP2P");
        provider.SideRequests.Should().HaveCount(3);
        provider.SideRequests.Should().OnlyContain(request => request.Side == Fx.Contracts.RateSide.Sell);

        var usdt = Account.Create(userContext.UserId.Value, "USDT", AccountType.Bank, Currency.USDT, Money.Of(5m, Currency.USDT), clock.UtcNow);
        await context.Accounts.AddAsync(usdt);
        await context.SaveChangesAsync();
        var usdtSale = await handler.HandleAsync(new(usdt.Id, 2m, bob.Id, 23m, clock.UtcNow, null, null, "USDT proxy sale"));
        usdtSale.IsSuccess.Should().BeTrue();
        (await transactions.GetByIdAsync(usdtSale.Value.OutflowId))!.AppliedRate.Should().Be(11.5m);
        provider.SideRequests.Should().HaveCount(4);
        provider.SideRequests.Should().OnlyContain(request => request.Side == Fx.Contracts.RateSide.Sell);
    }

    [Fact]
    public async Task TransferRegistration_UsesScopedServerBuySnapshotAndRejectsSpoofedProvenance()
    {
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var accounts = new AccountRepository(context);
        var transactions = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);
        var bob = Account.Create(userContext.UserId!.Value, "BOB", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        var usd = Account.Create(userContext.UserId.Value, "USD", AccountType.Bank, Currency.USD, Money.Zero(Currency.USD), clock.UtcNow);
        await context.Accounts.AddRangeAsync(bob, usd);
        await context.SaveChangesAsync();
        var provider = new RecordingSnapshotProvider((currency, baseCurrency) =>
            currency == "BOB" && baseCurrency == "USD"
                ? new Fx.Contracts.RateSnapshotDto(12m, "DolarApi:BinanceP2P", clock.UtcNow, false)
                : null);
        var handler = new RegisterTransferCommandHandler(accounts, transactions, userContext, clock, unitOfWork, provider);

        var created = await handler.HandleAsync(new(bob.Id, 120m, usd.Id, 10m, clock.UtcNow, null, null, "FX"));

        created.IsSuccess.Should().BeTrue();
        var outflow = await transactions.GetByIdAsync(created.Value.OutflowId);
        var inflow = await transactions.GetByIdAsync(created.Value.InflowId);
        outflow!.AppliedRate.Should().Be(12m);
        inflow!.AppliedRate.Should().Be(12m);
        outflow.RateSource.Should().Be("DolarApi:BinanceP2P");
        provider.SideRequests.Should().ContainSingle().Which.Should().Be(("BOB", "USD", Fx.Contracts.RateSide.Buy, userContext.UserId));
        var spoofed = await handler.HandleAsync(new(bob.Id, 120m, usd.Id, 10m, clock.UtcNow, 12m, "DolarApi:BinanceP2P", "spoof"));
        spoofed.IsFailure.Should().BeTrue();
        var excessivePrecision = await handler.HandleAsync(new(bob.Id, 120.001m, usd.Id, 10m, clock.UtcNow, null, null, "Precision"));
        excessivePrecision.IsFailure.Should().BeTrue();
        (await transactions.GetByAccountIdAsync(bob.Id)).Should().HaveCount(1);
    }

    [Fact]
    public async Task TransferCorrection_ReplacesFourRowsAtomicallyAndInjectedFailurePersistsNone()
    {
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var accounts = new AccountRepository(context);
        var transactions = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);
        var source = Account.Create(userContext.UserId!.Value, "Source", AccountType.Cash, Currency.BOB, Money.Of(100m, Currency.BOB), clock.UtcNow);
        var destination = Account.Create(userContext.UserId.Value, "Destination", AccountType.Bank, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        await context.Accounts.AddRangeAsync(source, destination);
        await context.SaveChangesAsync();
        var transferHandler = new RegisterTransferCommandHandler(accounts, transactions, userContext, clock, unitOfWork);
        var initial = await transferHandler.HandleAsync(new(source.Id, 10m, destination.Id, 10m, clock.UtcNow, null, null, "Original"));
        var originalOutflow = await transactions.GetByIdAsync(initial.Value.OutflowId);
        var transferId = originalOutflow!.TransferId!.Value;
        var service = new TransactionService(transactions, null!, transferHandler, null!, userContext, clock, accounts, unitOfWork);

        var corrected = await service.CorrectTransferAsync(transferId,
            new CorrectTransferRequest(source.Id, 20m, destination.Id, 20m, Description: "Correction"));
        corrected.IsSuccess.Should().BeTrue();
        context.ChangeTracker.Clear();
        (await transactions.GetByAccountIdAsync(source.Id)).Should().HaveCount(3);
        (await context.CalculateAccountBalanceAsync(source.Id)).Amount.Should().Be(80m);
        (await context.CalculateAccountBalanceAsync(destination.Id)).Amount.Should().Be(20m);
        var replacement = await transactions.GetByIdAsync(corrected.Value.OutflowId);
        var replacedTransferId = replacement!.TransferId!.Value;

        await context.Database.ExecuteSqlRawAsync("""
            CREATE TRIGGER fail_replacement_inflow BEFORE INSERT ON transactions
            WHEN NEW.transfer_id IS NOT NULL AND NEW.reverses_id IS NULL AND NEW.direction = 'Income'
            BEGIN SELECT RAISE(ABORT, 'injected transfer correction failure'); END;
            """);
        var failure = async () => await service.CorrectTransferAsync(replacedTransferId,
            new CorrectTransferRequest(source.Id, 30m, destination.Id, 30m, Description: "Must roll back"));
        await failure.Should().ThrowAsync<Exception>();
        context.ChangeTracker.Clear();
        (await transactions.GetByAccountIdAsync(source.Id)).Should().HaveCount(3);
        (await transactions.GetByAccountIdAsync(destination.Id)).Should().HaveCount(3);
        (await transactions.GetReversalByOriginalIdAsync(corrected.Value.OutflowId)).Should().BeNull();
        (await transactions.GetReversalByOriginalIdAsync(corrected.Value.InflowId)).Should().BeNull();
        (await context.CalculateAccountBalanceAsync(source.Id)).Amount.Should().Be(80m);
        (await context.CalculateAccountBalanceAsync(destination.Id)).Amount.Should().Be(20m);
    }

    [Fact]
    public async Task TransferCorrection_UsesTheSameServerOwnedFxValidationAsCreation()
    {
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var accounts = new AccountRepository(context);
        var transactions = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);
        var bob = Account.Create(userContext.UserId!.Value, "BOB", AccountType.Cash, Currency.BOB, Money.Of(500m, Currency.BOB), clock.UtcNow);
        var usd = Account.Create(userContext.UserId.Value, "USD", AccountType.Bank, Currency.USD, Money.Zero(Currency.USD), clock.UtcNow);
        await context.Accounts.AddRangeAsync(bob, usd);
        await context.SaveChangesAsync();
        var provider = new RecordingSnapshotProvider((currency, baseCurrency) =>
            currency == "BOB" && baseCurrency == "USD"
                ? new Fx.Contracts.RateSnapshotDto(12m, "DolarApi:BinanceP2P", clock.UtcNow, false)
                : null);
        var transferHandler = new RegisterTransferCommandHandler(accounts, transactions, userContext, clock, unitOfWork, provider);
        var initial = await transferHandler.HandleAsync(new(bob.Id, 120m, usd.Id, 10m, clock.UtcNow, null, null, "Original"));
        var transferId = (await transactions.GetByIdAsync(initial.Value.OutflowId))!.TransferId!.Value;
        var service = new TransactionService(transactions, null!, transferHandler, null!, userContext, clock, accounts, unitOfWork);

        var invalid = await service.CorrectTransferAsync(transferId,
            new CorrectTransferRequest(bob.Id, 240m, usd.Id, 19m, Description: "Bad quote"));
        invalid.IsFailure.Should().BeTrue();
        (await transactions.GetReversalByOriginalIdAsync(initial.Value.OutflowId)).Should().BeNull();
        (await context.CalculateAccountBalanceAsync(bob.Id)).Amount.Should().Be(380m);

        var corrected = await service.CorrectTransferAsync(transferId,
            new CorrectTransferRequest(bob.Id, 240m, usd.Id, 20m, Description: "Corrected quote"));
        corrected.IsSuccess.Should().BeTrue();
        var replacement = await transactions.GetByIdAsync(corrected.Value.OutflowId);
        replacement!.AppliedRate.Should().Be(12m);
        replacement.RateSource.Should().Be("DolarApi:BinanceP2P");
        (await transactions.GetReversalByOriginalIdAsync(initial.Value.OutflowId))!.AppliedRate.Should().Be(12m);
        provider.SideRequests.Should().HaveCount(3);
    }

    [Fact]
    public async Task TransferCorrection_RejectsInconsistentSameCurrencyAmountsWithoutChangingOriginalBalances()
    {
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var accountRepo = new AccountRepository(context);
        var transactionRepo = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);
        var source = Account.Create(userContext.UserId!.Value, "Source", AccountType.Cash, Currency.BOB, Money.Of(100m, Currency.BOB), clock.UtcNow);
        var destination = Account.Create(userContext.UserId.Value, "Destination", AccountType.Bank, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        await context.Accounts.AddRangeAsync(source, destination);
        await context.SaveChangesAsync();
        var transferHandler = new RegisterTransferCommandHandler(accountRepo, transactionRepo, userContext, clock, unitOfWork);
        var initial = await transferHandler.HandleAsync(new(source.Id, 10m, destination.Id, 10m, clock.UtcNow, null, null, "Original"));
        var transferId = (await transactionRepo.GetByIdAsync(initial.Value.OutflowId))!.TransferId!.Value;
        var service = new TransactionService(transactionRepo, null!, transferHandler, null!, userContext, clock, accountRepo, unitOfWork);

        var result = await service.CorrectTransferAsync(transferId,
            new CorrectTransferRequest(source.Id, 20m, destination.Id, 19m, Description: "Invalid replacement"));

        result.IsFailure.Should().BeTrue();
        (await transactionRepo.GetTransferLegsAsync(userContext.UserId.Value, transferId)).Should().HaveCount(2);
        (await transactionRepo.GetReversalByOriginalIdAsync(initial.Value.OutflowId)).Should().BeNull();
        (await transactionRepo.GetReversalByOriginalIdAsync(initial.Value.InflowId)).Should().BeNull();
        (await context.CalculateAccountBalanceAsync(source.Id)).Amount.Should().Be(90m);
        (await context.CalculateAccountBalanceAsync(destination.Id)).Amount.Should().Be(10m);
    }

    [Fact]
    public async Task TransferReversal_LegacyInflowIdReversesBothLegs()
    {
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var accounts = new AccountRepository(context);
        var transactions = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);
        var source = Account.Create(userContext.UserId!.Value, "Source", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        var destination = Account.Create(userContext.UserId.Value, "Destination", AccountType.Bank, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        await context.Accounts.AddRangeAsync(source, destination);
        await context.SaveChangesAsync();
        var created = await new RegisterTransferCommandHandler(accounts, transactions, userContext, clock, unitOfWork)
            .HandleAsync(new(source.Id, 25m, destination.Id, 25m, clock.UtcNow, null, null, "Legacy action"));

        var reversed = await new ReverseTransactionCommandHandler(transactions, userContext, clock, unitOfWork)
            .HandleAsync(new(created.Value.InflowId));

        reversed.IsSuccess.Should().BeTrue();
        (await transactions.GetReversalByOriginalIdAsync(created.Value.OutflowId)).Should().NotBeNull();
        (await transactions.GetReversalByOriginalIdAsync(created.Value.InflowId)).Should().NotBeNull();
    }

    [Fact]
    public async Task TransferReversal_ConcurrentWinnerIsReportedAsConflictWithoutSecondPair()
    {
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var repository = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);
        var source = Account.Create(userContext.UserId!.Value, "Source", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        var destination = Account.Create(userContext.UserId.Value, "Destination", AccountType.Bank, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        await context.Accounts.AddRangeAsync(source, destination);
        var pair = Transaction.CreateTransfer(userContext.UserId.Value, source.Id, Money.Of(10m, Currency.BOB),
            destination.Id, Money.Of(10m, Currency.BOB), clock.UtcNow, null, null, "Race");
        var (winnerOut, winnerIn) = Transaction.CreateTransferReversal(pair.Outflow, pair.Inflow, clock.UtcNow);
        await context.Transactions.AddRangeAsync(pair.Outflow, pair.Inflow, winnerOut, winnerIn);
        await context.SaveChangesAsync();

        var staleReadRepository = new StaleReversalReadRepository(repository, 2);
        var handler = new ReverseTransactionCommandHandler(staleReadRepository, userContext, clock, unitOfWork);
        var result = await handler.HandleAsync(new(pair.Outflow.TransferId!.Value));

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Transaction.AlreadyReversed");
        context.ChangeTracker.Clear();
        (await context.Transactions.IgnoreQueryFilters().Where(row => row.TransferId == pair.Outflow.TransferId).CountAsync()).Should().Be(2);
        (await context.Transactions.IgnoreQueryFilters().Where(row => row.ReversesId == pair.Outflow.Id || row.ReversesId == pair.Inflow.Id).CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task TransferReversal_RejectsForeignOwnerLogicalTransferId()
    {
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var accounts = new AccountRepository(context);
        var transactions = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);
        var source = Account.Create(userContext.UserId!.Value, "Source", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        var destination = Account.Create(userContext.UserId.Value, "Destination", AccountType.Bank, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        await context.Accounts.AddRangeAsync(source, destination);
        await context.SaveChangesAsync();
        var registered = await new RegisterTransferCommandHandler(accounts, transactions, userContext, clock, unitOfWork)
            .HandleAsync(new(source.Id, 15m, destination.Id, 15m, clock.UtcNow, null, null, "Private"));
        var transferId = (await transactions.GetByIdAsync(registered.Value.OutflowId))!.TransferId!.Value;
        userContext.UserId = Guid.NewGuid();

        var result = await new ReverseTransactionCommandHandler(transactions, userContext, clock, unitOfWork)
            .HandleAsync(new(transferId));

        result.IsFailure.Should().BeTrue();
        context.ChangeTracker.Clear();
        var rows = await context.Transactions.IgnoreQueryFilters().Where(row => row.TransferId == transferId).ToListAsync();
        rows.Should().HaveCount(2);
        foreach (var row in rows)
            (await transactions.GetReversalByOriginalIdAsync(row.Id)).Should().BeNull();
    }

    [Fact]
    public async Task TransferReversal_ReversesBothLegsOnceAndKeepsDistinctAuditGroups()
    {
        var userContext = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var accounts = new AccountRepository(context);
        var transactions = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);
        var source = Account.Create(userContext.UserId!.Value, "Source", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), clock.UtcNow);
        var destination = Account.Create(userContext.UserId.Value, "Destination", AccountType.Bank, Currency.USD, Money.Zero(Currency.USD), clock.UtcNow);
        await context.Accounts.AddRangeAsync(source, destination);
        await context.SaveChangesAsync();

        var register = new RegisterTransferCommandHandler(accounts, transactions, userContext, clock, unitOfWork,
            new MockSnapshotProvider(new Fx.Contracts.RateSnapshotDto(12m, "DolarApi:BinanceP2P", clock.UtcNow, false)));
        var created = await register.HandleAsync(new(source.Id, 120m, destination.Id, 10m, clock.UtcNow, null, null, "FX"));
        var transferId = (await transactions.GetByIdAsync(created.Value.OutflowId))!.TransferId!.Value;
        var reverse = new ReverseTransactionCommandHandler(transactions, userContext, clock, unitOfWork);
        (await reverse.HandleAsync(new(transferId))).IsSuccess.Should().BeTrue();
        (await reverse.HandleAsync(new(created.Value.InflowId))).IsFailure.Should().BeTrue();

        var originalLegs = await transactions.GetTransferLegsAsync(userContext.UserId.Value,
            (await transactions.GetByIdAsync(created.Value.OutflowId))!.TransferId!.Value);
        var reversals = new[] {
            await transactions.GetReversalByOriginalIdAsync(created.Value.OutflowId),
            await transactions.GetReversalByOriginalIdAsync(created.Value.InflowId)
        };
        reversals.Should().OnlyContain(row => row != null);
        reversals.Select(row => row!).Should().OnlyContain(row => row.TransferId != originalLegs[0].TransferId && row.AppliedRate == 12m && row.RateSource == "DolarApi:BinanceP2P");

        var service = new TransactionService(transactions, null!, null!, null!, userContext, clock);
        var active = await service.GetMovementsAsync(new MovementQuery());
        active.Value.Items.Should().BeEmpty();
        var audit = await service.GetMovementsAsync(new MovementQuery(Mode: MovementHistoryMode.Audit));
        audit.Value.Items.Where(item => item.Kind == "Transfer").Should().HaveCount(2);
        audit.Value.Items.Where(item => item.Kind == "Transfer").Should().OnlyContain(item => item.Legs.Count == 2);
    }

    [Fact]
    public async Task MovementQuery_MaterializesOnlyTheRequestedPageAndItsLegs()
    {
        var userContext = new TestUserContext();
        var counter = new TransactionMaterializationCounter();
        var (context, connection) = CreateDbContext(userContext, counter);
        using var _ = connection;
        using var __ = context;
        var account = Account.Create(userContext.UserId!.Value, "Cash", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        await context.Accounts.AddAsync(account);
        var timestamp = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc);
        var transactions = Enumerable.Range(0, 125).Select(index => Transaction.Create(userContext.UserId.Value,
            account.Id, Money.Of(index + 0.01m, Currency.BOB), TransactionDirection.Expense, null,
            timestamp.AddMinutes(index), $"item {index}")).ToList();
        await context.Transactions.AddRangeAsync(transactions);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();
        counter.Count = 0;

        var service = new TransactionService(new TransactionRepository(context), null!, null!, null!, userContext, new TestClock());
        var result = await service.GetMovementsAsync(new MovementQuery(Page: 1, PageSize: 1));

        result.Value.Items.Should().HaveCount(1);
        result.Value.Summary.Should().ContainSingle().Which.Expenses.Should().Be(7751.25m);
        counter.Count.Should().BeLessThan(10, "page selection must happen in SQL rather than materializing all 125 owner rows");
    }

    [Fact]
    public async Task OrdinaryCorrection_InvalidReplacementAndMidSaveFailurePersistNoRows()
    {
        var user = new TestUserContext();
        var clock = new TestClock();
        var (context, connection) = CreateDbContext(user);
        using var _ = connection;
        using var __ = context;
        var account = Account.Create(user.UserId!.Value, "Cash", AccountType.Cash, Currency.BOB, Money.Of(100m, Currency.BOB), clock.UtcNow);
        var category = Category.Create(user.UserId.Value, "Dining", null, "Expense|food|red", clock.UtcNow);
        await context.Accounts.AddAsync(account);
        await context.Categories.AddAsync(category);
        await context.SaveChangesAsync();
        var accounts = new AccountRepository(context);
        var transactions = new TransactionRepository(context);
        var unitOfWork = new UnitOfWork(context);
        var register = new RegisterTransactionCommandHandler(accounts, transactions, user, clock, unitOfWork);
        var service = new TransactionService(transactions, register, null!, new ReverseTransactionCommandHandler(transactions, user, clock, unitOfWork),
            user, clock, accounts, unitOfWork, new CategoryRepository(context));
        var originalId = (await service.RegisterTransactionAsync(new RegisterTransactionRequest(account.Id, 10m,
            TransactionDirection.Expense, OccurredAt: clock.UtcNow, AppliedRate: 12m, RateSource: "Manual",
            Allocations: [new(category.Id, 10m)]))).Value;

        var invalid = await service.UpdateTransactionAsync(originalId, new UpdateTransactionRequest(account.Id, 11m,
            TransactionDirection.Expense, OccurredAt: clock.UtcNow, Allocations: [new(category.Id, 10m)]));
        invalid.IsFailure.Should().BeTrue();
        (await transactions.GetReversalByOriginalIdAsync(originalId)).Should().BeNull();
        (await context.CalculateAccountBalanceAsync(account.Id)).Amount.Should().Be(90m);

        await context.Database.ExecuteSqlRawAsync("""
            CREATE TRIGGER fail_ordinary_replacement BEFORE INSERT ON transactions
            WHEN NEW.description = 'Injected failure'
            BEGIN SELECT RAISE(ABORT, 'injected ordinary correction failure'); END;
            """);
        var failure = async () => await service.UpdateTransactionAsync(originalId, new UpdateTransactionRequest(account.Id, 15m,
            TransactionDirection.Expense, Description: "Injected failure", OccurredAt: clock.UtcNow,
            Allocations: [new(category.Id, 15m)]));
        await failure.Should().ThrowAsync<Exception>();
        context.ChangeTracker.Clear();
        (await transactions.GetReversalByOriginalIdAsync(originalId)).Should().BeNull();
        (await transactions.GetByAccountIdAsync(account.Id)).Should().ContainSingle();
        (await context.CalculateAccountBalanceAsync(account.Id)).Amount.Should().Be(90m);
    }

    [Fact]
    public async Task MovementAllocationFilterCountsParentOnceAndReturnsFullAmountOnPage()
    {
        var user = new TestUserContext();
        var (context, connection) = CreateDbContext(user);
        using var _ = connection;
        using var __ = context;
        var account = Account.Create(user.UserId!.Value, "Cash", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        var first = Category.Create(user.UserId.Value, "Dining", null, "Expense|food|red", DateTime.UtcNow);
        var second = Category.Create(user.UserId.Value, "Transport", null, "Expense|car|blue", DateTime.UtcNow);
        var transaction = Transaction.Create(user.UserId.Value, account.Id, Money.Of(10m, Currency.BOB), TransactionDirection.Expense,
            null, DateTime.UtcNow, "Split", allocations: [new(first.Id, 4m), new(second.Id, 6m)]);
        await context.Accounts.AddAsync(account);
        await context.Categories.AddRangeAsync(first, second);
        await context.Transactions.AddAsync(transaction);
        await context.SaveChangesAsync();
        var service = new TransactionService(new TransactionRepository(context), null!, null!, null!, user, new TestClock());

        var result = await service.GetMovementsAsync(new MovementQuery(CategoryId: second.Id, PageSize: 1));

        result.Value.TotalCount.Should().Be(1);
        result.Value.Items.Should().ContainSingle().Which.Amount.Should().Be(10m);
        result.Value.Items.Single().Allocations.Should().HaveCount(2);
        result.Value.Summary.Should().ContainSingle().Which.Expenses.Should().Be(10m);
    }

    [Fact]
    public async Task MovementQuery_SummariesSupportOmittedFiltersAndReportedDateRange()
    {
        var user = new TestUserContext();
        var (context, connection) = CreateDbContext(user);
        using var _ = connection;
        using var __ = context;
        var userId = user.UserId!.Value;
        var account = Account.Create(userId, "Cash", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        var category = Category.Create(userId, "Food", null, null, DateTime.UtcNow);
        var occurredAt = new DateTime(2026, 11, 15, 12, 0, 0, DateTimeKind.Utc);
        var transaction = Transaction.Create(userId, account.Id, Money.Of(25m, Currency.BOB), TransactionDirection.Expense,
            category.Id, occurredAt, "November expense");
        await context.Accounts.AddAsync(account);
        await context.Categories.AddAsync(category);
        await context.Transactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        var repository = new TransactionRepository(context);
        var requests = new[]
        {
            new MovementRepositoryQuery(null, null, null, null, null, null, false, 1, 10),
            new MovementRepositoryQuery(new DateTime(2026, 11, 1, 4, 0, 0, DateTimeKind.Utc),
                new DateTime(2026, 12, 1, 4, 0, 0, DateTimeKind.Utc), null, null, null, null, false, 1, 10),
            new MovementRepositoryQuery(null, null, account.Id, null, null, null, false, 1, 10),
            new MovementRepositoryQuery(null, null, null, category.Id, null, null, false, 1, 10),
            new MovementRepositoryQuery(null, null, null, null, null, "November", false, 1, 10),
            new MovementRepositoryQuery(new DateTime(2026, 11, 1, 4, 0, 0, DateTimeKind.Utc),
                new DateTime(2026, 12, 1, 4, 0, 0, DateTimeKind.Utc), account.Id, category.Id, "Expense", "November", false, 1, 10),
            new MovementRepositoryQuery(null, null, null, null, null, null, false, 1, 10)
        };

        foreach (var request in requests)
        {
            var result = await repository.GetMovementPageAsync(userId, request);
            result.TotalCount.Should().Be(1);
            result.Items.Should().ContainSingle().Which.Representative.Id.Should().Be(transaction.Id);
            result.Summary.Should().ContainSingle().Which.Expenses.Should().Be(25m);
        }
    }

    private sealed class TransactionMaterializationCounter : IMaterializationInterceptor
    {
        public int Count { get; set; }
        public object InitializedInstance(MaterializationInterceptionData materializationData, object entity)
        {
            if (entity is Transaction) Count++;
            return entity;
        }
    }

    [Fact]
    public async Task MovementQuery_SearchTreatsWildcardsLiterallyAndAuditSummariesExcludeReversals()
    {
        var userContext = new TestUserContext();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var userId = userContext.UserId!.Value;
        var account = Account.Create(userId, "Cash", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        await context.Accounts.AddAsync(account);
        var when = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc);
        var percent = Transaction.Create(userId, account.Id, Money.Of(1m, Currency.BOB), TransactionDirection.Expense, null, when, "literal 50% match");
        var underscore = Transaction.Create(userId, account.Id, Money.Of(2m, Currency.BOB), TransactionDirection.Expense, null, when.AddMinutes(1), "literal under_score match");
        var escape = Transaction.Create(userId, account.Id, Money.Of(3m, Currency.BOB), TransactionDirection.Expense, null, when.AddMinutes(2), "literal ! escape match");
        var original = Transaction.Create(userId, account.Id, Money.Of(10m, Currency.BOB), TransactionDirection.Expense, null, when.AddMinutes(3), "reversed purchase");
        var reversal = Transaction.CreateReversal(original, when.AddMinutes(4), "correction");
        await context.Transactions.AddRangeAsync(percent, underscore, escape, original, reversal);
        await context.SaveChangesAsync();
        var service = new TransactionService(new TransactionRepository(context), null!, null!, null!, userContext, new TestClock());

        foreach (var (literal, expectedId, expectedExpense) in new[]
        {
            ("50%", percent.Id, 1m), ("_", underscore.Id, 2m), ("!", escape.Id, 3m)
        })
        {
            var filtered = await service.GetMovementsAsync(new MovementQuery(Search: literal));
            filtered.Value.Items.Should().ContainSingle().Which.Id.Should().Be(expectedId);
            filtered.Value.Summary.Should().ContainSingle().Which.Expenses.Should().Be(expectedExpense);
        }

        var whitespace = await service.GetMovementsAsync(new MovementQuery(Search: "   "));
        whitespace.Value.TotalCount.Should().Be(3);
        var audit = await service.GetMovementsAsync(new MovementQuery(Mode: MovementHistoryMode.Audit));
        audit.Value.Items.Should().Contain(item => item.IsReversal);
        audit.Value.Summary.Should().ContainSingle().Which.Expenses.Should().Be(16m);
        audit.Value.Summary.Single().Income.Should().Be(0m);
    }

    [Fact]
    public async Task MovementQueryRows_AreOwnerScopedAndStableForEqualTimestamps()
    {
        var userContext = new TestUserContext();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var otherUser = Guid.NewGuid();
        var account = Account.Create(userContext.UserId!.Value, "Cash", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        var otherAccount = Account.Create(otherUser, "Other", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        await context.Accounts.AddRangeAsync(account, otherAccount);
        var at = new DateTime(2026, 1, 2, 12, 0, 0, DateTimeKind.Utc);
        var first = Transaction.Create(userContext.UserId.Value, account.Id, Money.Of(10m, Currency.BOB), TransactionDirection.Expense, null, at, "first");
        var second = Transaction.Create(userContext.UserId.Value, account.Id, Money.Of(20m, Currency.BOB), TransactionDirection.Income, null, at, "second");
        var privateRow = Transaction.Create(otherUser, otherAccount.Id, Money.Of(99m, Currency.BOB), TransactionDirection.Income, null, at, "private");
        await context.Transactions.AddRangeAsync(first, second, privateRow);
        await context.SaveChangesAsync();

        var page = await new TransactionRepository(context).GetMovementPageAsync(userContext.UserId.Value,
            new MovementRepositoryQuery(null, null, null, null, null, null, false, 1, 50));

        var repeatedPage = await new TransactionRepository(context).GetMovementPageAsync(userContext.UserId.Value,
            new MovementRepositoryQuery(null, null, null, null, null, null, false, 1, 50));
        page.Items.Select(entry => entry.Representative.Id).Should().Equal(repeatedPage.Items.Select(entry => entry.Representative.Id));
        page.Items.Should().Contain(entry => entry.Representative.Id == first.Id);
        page.Items.Should().Contain(entry => entry.Representative.Id == second.Id);
        page.Items.Should().NotContain(entry => entry.Representative.Id == privateRow.Id);
    }

    [Fact]
    public async Task MovementQuery_GroupsTransfersExcludesReversalsAndSummarizesAcrossPages()
    {
        var userContext = new TestUserContext();
        var (context, connection) = CreateDbContext(userContext);
        using var _ = connection;
        using var __ = context;
        var userId = userContext.UserId!.Value;
        var outgoing = Account.Create(userId, "Wallet", AccountType.Cash, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        var incoming = Account.Create(userId, "Bank", AccountType.Bank, Currency.BOB, Money.Zero(Currency.BOB), DateTime.UtcNow);
        var category = Ledger.Domain.Categories.Category.Create(userId, "Food", null, null, DateTime.UtcNow);
        await context.Accounts.AddRangeAsync(outgoing, incoming);
        await context.Categories.AddAsync(category);
        var start = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc);
        var transactions = Enumerable.Range(0, 120).Select(index => Transaction.Create(userId, outgoing.Id,
            Money.Of(index + 1m, Currency.BOB), TransactionDirection.Expense, category.Id,
            start.AddMinutes(index), $"expense {index}", 6m, "snapshot")).ToList();
        var reversalSource = transactions[0];
        var reversal = Transaction.CreateReversal(reversalSource, start.AddDays(1), "correction");
        var transfer = Transaction.CreateTransfer(userId, outgoing.Id, Money.Of(25m, Currency.BOB), incoming.Id,
            Money.Of(25m, Currency.BOB), start.AddHours(3), 6m, "snapshot", "move");
        await context.Transactions.AddRangeAsync(transactions);
        await context.Transactions.AddRangeAsync(reversal, transfer.Outflow, transfer.Inflow);
        await context.SaveChangesAsync();

        var service = new TransactionService(new TransactionRepository(context), null!, null!, null!, userContext, new TestClock());
        var page = await service.GetMovementsAsync(new MovementQuery(start, start.AddDays(1), Page: 1, PageSize: 100));
        page.IsSuccess.Should().BeTrue();
        page.Value.TotalCount.Should().Be(120); // 119 active expenses plus one logical transfer
        page.Value.Items.Should().HaveCount(100);
        var secondPage = await service.GetMovementsAsync(new MovementQuery(start, start.AddDays(1), Page: 2, PageSize: 100));
        secondPage.Value.Items.Should().HaveCount(20);
        page.Value.Items.Select(item => item.Id).Intersect(secondPage.Value.Items.Select(item => item.Id)).Should().BeEmpty();
        page.Value.Summary.Should().ContainSingle().Which.Expenses.Should().Be(7259m); // 120 expenses except corrected 1
        page.Value.Items.Should().Contain(item => item.Kind == "Transfer" && item.Legs.Count == 2);
        page.Value.Items.Should().NotContain(item => item.IsReversal || item.Id == reversalSource.Id);
        page.Value.Items.First().OccurredAt.Should().BeOnOrAfter(page.Value.Items.Last().OccurredAt);

        var incomingView = await service.GetMovementsAsync(new MovementQuery(AccountId: incoming.Id, Type: MovementKind.Transfer));
        incomingView.Value.Items.Should().ContainSingle().Which.AccountId.Should().Be(incoming.Id);
        incomingView.Value.Items.Single().Legs.Should().HaveCount(2);

        var audit = await service.GetMovementsAsync(new MovementQuery(Mode: MovementHistoryMode.Audit));
        audit.Value.Items.Should().Contain(item => item.IsReversal);
        var auditLastPage = await service.GetMovementsAsync(new MovementQuery(Mode: MovementHistoryMode.Audit, Page: 3));
        auditLastPage.Value.Items.Should().Contain(item => item.Id == reversalSource.Id);

        var endExclusive = await service.GetMovementsAsync(new MovementQuery(StartUtc: start.AddMinutes(1), EndUtcExclusive: start.AddMinutes(2)));
        endExclusive.Value.TotalCount.Should().Be(1);
        var categorySearch = await service.GetMovementsAsync(new MovementQuery(CategoryId: category.Id, Search: "expense 119", Type: MovementKind.Expense));
        categorySearch.Value.TotalCount.Should().Be(1);
        categorySearch.Value.Items.Single().CategoryName.Should().Be("Food");
        var invalid = await service.GetMovementsAsync(new MovementQuery(PageSize: 101));
        invalid.IsFailure.Should().BeTrue();
    }

    private sealed class StaleReversalReadRepository(ITransactionRepository inner, int initialMisses) : ITransactionRepository
    {
        private int _misses = initialMisses;
        public Task<Transaction?> GetByIdAsync(Guid id, CancellationToken ct = default) => inner.GetByIdAsync(id, ct);
        public Task<Transaction?> GetReversalByOriginalIdAsync(Guid id, CancellationToken ct = default)
        {
            if (Interlocked.Decrement(ref _misses) >= 0) return Task.FromResult<Transaction?>(null);
            return inner.GetReversalByOriginalIdAsync(id, ct);
        }
        public Task<IReadOnlyList<Transaction>> GetTransferLegsAsync(Guid userId, Guid transferId, CancellationToken ct = default) => inner.GetTransferLegsAsync(userId, transferId, ct);
        public Task<IReadOnlyList<Transaction>> GetByAccountIdAsync(Guid accountId, CancellationToken ct = default) => inner.GetByAccountIdAsync(accountId, ct);
        public Task<MovementQueryPage> GetMovementPageAsync(Guid userId, MovementRepositoryQuery query, CancellationToken ct = default) => inner.GetMovementPageAsync(userId, query, ct);
        public Task<IReadOnlyList<Transaction>> GetFilteredAsync(Guid? userId = null, Guid? accountId = null, TransactionDirection? direction = null, DateTime? from = null, DateTime? to = null, int limit = 50, CancellationToken ct = default) => inner.GetFilteredAsync(userId, accountId, direction, from, to, limit, ct);
        public Task<IReadOnlyList<MonthlyTransactionCurrencyTotal>> GetMonthlyActivityByCurrencyAsync(Guid userId, DateTime start, DateTime end, CancellationToken ct = default) => inner.GetMonthlyActivityByCurrencyAsync(userId, start, end, ct);
        public Task<IReadOnlyList<MonthlyCategoryExpense>> GetMonthlyCategoryExpensesAsync(Guid userId, DateTime start, DateTime end, CancellationToken ct = default) => inner.GetMonthlyCategoryExpensesAsync(userId, start, end, ct);
        public Task<decimal> CalculateBalanceAsync(Guid accountId, CancellationToken ct = default) => inner.CalculateBalanceAsync(accountId, ct);
        public Task AddAsync(Transaction transaction, CancellationToken ct = default) => inner.AddAsync(transaction, ct);
        public Task AddRangeAsync(IEnumerable<Transaction> transactions, CancellationToken ct = default) => inner.AddRangeAsync(transactions, ct);
    }

    private sealed class RecordingSnapshotProvider(Func<string, string, Fx.Contracts.RateSnapshotDto?> getSnapshot) : Fx.Contracts.IRateSnapshotProvider
    {
        public List<(string Currency, string BaseCurrency, Guid? UserId)> Requests { get; } = [];
        public List<(string Currency, string BaseCurrency, Fx.Contracts.RateSide Side, Guid? UserId)> SideRequests { get; } = [];

        public Task<Fx.Contracts.RateSnapshotDto?> GetSnapshotAsync(string currencyCode, string baseCurrencyCode, Guid? userId = null, CancellationToken cancellationToken = default)
        {
            Requests.Add((currencyCode, baseCurrencyCode, userId));
            return Task.FromResult(getSnapshot(currencyCode, baseCurrencyCode));
        }

        public Task<Fx.Contracts.RateSnapshotDto?> GetSnapshotAsync(string currencyCode, string baseCurrencyCode, Fx.Contracts.RateSide side, Guid? userId = null, CancellationToken cancellationToken = default)
        {
            SideRequests.Add((currencyCode, baseCurrencyCode, side, userId));
            return Task.FromResult(getSnapshot(currencyCode, baseCurrencyCode) is { } snapshot ? snapshot with { Side = side } : null);
        }
    }

    private class MockSnapshotProvider : Fx.Contracts.IRateSnapshotProvider
    {
        private readonly Fx.Contracts.RateSnapshotDto _dto;
        public MockSnapshotProvider(Fx.Contracts.RateSnapshotDto dto) => _dto = dto;

        public Task<Fx.Contracts.RateSnapshotDto?> GetSnapshotAsync(string currencyCode, string baseCurrencyCode, Guid? userId = null, CancellationToken cancellationToken = default) =>
            Task.FromResult<Fx.Contracts.RateSnapshotDto?>(_dto);

        public Task<Fx.Contracts.RateSnapshotDto?> GetSnapshotAsync(string currencyCode, string baseCurrencyCode, Fx.Contracts.RateSide side, Guid? userId = null, CancellationToken cancellationToken = default) =>
            Task.FromResult<Fx.Contracts.RateSnapshotDto?>(_dto with { Side = side });
    }
}
