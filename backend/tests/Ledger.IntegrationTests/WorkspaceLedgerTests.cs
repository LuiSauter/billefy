using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Fx.Contracts;
using Ledger.Application.Abstractions;
using Ledger.Application.Categories.Services;
using Ledger.Application.Services;
using Ledger.Contracts;
using Ledger.Domain.Accounts;
using Ledger.Domain.Categories;
using Ledger.Domain.Transactions;
using Ledger.Infrastructure;
using Ledger.Infrastructure.Repositories;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Ledger.IntegrationTests;

public sealed class WorkspaceLedgerTests : IDisposable
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly TestUser _user = new();
    private readonly TestClock _clock = new();
    private readonly LedgerDbContext _db;
    private readonly LedgerModule _ledger;
    private readonly TransactionRepository _transactions;
    private readonly Account _account;
    private readonly Category _category;

    public WorkspaceLedgerTests()
    {
        _connection.Open();
        _db = new LedgerDbContext(new DbContextOptionsBuilder<LedgerDbContext>().UseSqlite(_connection).Options, _user);
        _db.Database.EnsureCreated();
        _transactions = new TransactionRepository(_db);
        var categories = new CategoryRepository(_db);
        var unitOfWork = new UnitOfWork(_db);
        _ledger = new LedgerModule(new AccountRepository(_db), _transactions,
            new CategoryService(categories, unitOfWork, _user, _clock), unitOfWork, _clock, categories, new TestRates());
        _account = Account.Create(_user.UserId!.Value, "Personal cash", AccountType.Cash, Currency.USD, Money.Of(500m, Currency.USD), _clock.UtcNow);
        _category = Category.Create(_user.UserId.Value, "Food", null, "Expense|utensils|rose", _clock.UtcNow);
        _db.Accounts.Add(_account);
        _db.Categories.Add(_category);
        _db.SaveChanges();
    }

    [Fact]
    public async Task SettlementLegs_OnlyAffectBalance_SharedExpenseCounts_AndReversalsAreIdempotent()
    {
        var expense = await _ledger.RegisterSharedExpenseAsync(Expense());
        var outflow = await _ledger.RegisterWorkspaceSettlementLegAsync(Leg("Outflow", 50m));
        var inflow = await _ledger.RegisterWorkspaceSettlementLegAsync(Leg("Inflow", 20m));
        foreach (var result in new[] { expense, outflow, inflow }) result.ErrorCode.Should().BeNull();
        (await _ledger.GetAccountBalanceAsync(_account.Id)).Should().Be(370m);
        await AssertMetrics(100m);
        var ordinary = await _transactions.GetMovementPageAsync(_user.UserId!.Value, Query(null));
        ordinary.TotalCount.Should().Be(3);
        ordinary.Summary.Should().ContainSingle().Which.Expenses.Should().Be(100m);
        ordinary.Summary.Single().Income.Should().Be(0m);
        (await _transactions.GetMovementPageAsync(_user.UserId.Value, Query("Expense"))).Items.Should().ContainSingle()
            .Which.Representative.Id.Should().Be(expense.TransactionId!.Value);
        (await _transactions.GetMovementPageAsync(_user.UserId.Value, Query("Income"))).Items.Should().BeEmpty();
        (await _transactions.GetFilteredAsync(_user.UserId, direction: TransactionDirection.Expense)).Should().ContainSingle();

        foreach (var result in new[] { outflow, inflow, expense })
        {
            var original = await _transactions.GetByIdAsync(result.TransactionId!.Value);
            var reversal = await _ledger.ReverseWorkspaceLedgerTransactionAsync(_user.UserId.Value, original!.Id);
            reversal.ErrorCode.Should().BeNull();
            var saved = await _transactions.GetByIdAsync(reversal.TransactionId!.Value);
            saved!.WorkspaceSettlementId.Should().Be(original.WorkspaceSettlementId);
            saved.AppliedRate.Should().Be(7m);
            saved.RateSource.Should().Be("Test snapshot");
            saved.ReversesId.Should().Be(original.Id);
            (await _ledger.ReverseWorkspaceLedgerTransactionAsync(_user.UserId.Value, original.Id))
                .ErrorCode.Should().Be("Workspace.AlreadyReversed");
        }
        (await _ledger.GetAccountBalanceAsync(_account.Id)).Should().Be(500m);
        await AssertMetrics(0m);
        (await _transactions.GetMovementPageAsync(_user.UserId.Value, Query("Expense"))).Items.Should().BeEmpty();
        var audit = await _transactions.GetMovementPageAsync(_user.UserId.Value, Query("Income") with { AuditMode = true });
        audit.Items.Should().ContainSingle().Which.Representative.ReversesId.Should().Be(expense.TransactionId);
        (await _db.Transactions.CountAsync()).Should().Be(6);
    }

    [Fact]
    public async Task InvalidAmountsCurrenciesCategoriesAndOwners_DoNotPost()
    {
        var foreignId = Guid.NewGuid();
        var foreignAccount = Account.Create(foreignId, "Foreign cash", AccountType.Cash, Currency.USD, Money.Zero(Currency.USD), _clock.UtcNow);
        var foreignCategory = Category.Create(foreignId, "Foreign category", null, null, _clock.UtcNow);
        var incomeCategory = Category.Create(_user.UserId!.Value, "Salary", null, "Income|briefcase|green", _clock.UtcNow);
        _db.Accounts.Add(foreignAccount);
        _db.Categories.AddRange(foreignCategory, incomeCategory);
        await _db.SaveChangesAsync();
        foreach (var (request, code) in new[]
        {
            (Expense() with { AccountId = foreignAccount.Id }, "Account.NotFound"),
            (Expense() with { Currency = "BOB" }, "Workspace.CurrencyMismatch"),
            (Expense() with { Amount = 1.001m }, "Workspace.InvalidPrecision"),
            (Expense() with { Amount = 0m }, "Workspace.InvalidAmount"),
            (Expense() with { Amount = -1m }, "Workspace.InvalidAmount"),
            (Expense() with { CategoryId = foreignCategory.Id }, "Category.NotFound"),
            (Expense() with { CategoryId = incomeCategory.Id }, "Category.DirectionMismatch")
        })
            (await _ledger.RegisterSharedExpenseAsync(request)).ErrorCode.Should().Be(code);
        foreach (var (request, code) in new[]
        {
            (Leg("Income", 1m), "Workspace.InvalidSettlementLeg"),
            (Leg("Inflow", 1m) with { WorkspaceSettlementId = Guid.Empty }, "Workspace.InvalidSettlementLeg"),
            (Leg("Outflow", 1m) with { AccountId = foreignAccount.Id }, "Account.NotFound"),
            (Leg("Outflow", 1.001m), "Workspace.InvalidPrecision"),
            (Leg("Inflow", 1m) with { Currency = "BOB" }, "Workspace.CurrencyMismatch")
        })
            (await _ledger.RegisterWorkspaceSettlementLegAsync(request)).ErrorCode.Should().Be(code);
        _account.Archive();
        await _db.SaveChangesAsync();
        (await _ledger.RegisterSharedExpenseAsync(Expense())).ErrorCode.Should().Be("Account.Archived");
        (await _ledger.RegisterWorkspaceSettlementLegAsync(Leg("Outflow", 1m))).ErrorCode.Should().Be("Account.Archived");
        (await _db.Transactions.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Reversal_RejectsForeignTransactionAndReversalItself_AndAllowsArchivedAccount()
    {
        var original = await _ledger.RegisterSharedExpenseAsync(Expense() with { CategoryId = null });
        (await _ledger.ReverseWorkspaceLedgerTransactionAsync(Guid.NewGuid(), original.TransactionId!.Value))
            .ErrorCode.Should().Be("Workspace.TransactionNotFound");
        _account.Archive();
        await _db.SaveChangesAsync();
        var reversal = await _ledger.ReverseWorkspaceLedgerTransactionAsync(_user.UserId!.Value, original.TransactionId.Value);
        reversal.ErrorCode.Should().BeNull();
        (await _ledger.ReverseWorkspaceLedgerTransactionAsync(_user.UserId.Value, reversal.TransactionId!.Value))
            .ErrorCode.Should().Be("Workspace.TransactionNotFound");
        (await _ledger.GetAccountBalanceAsync(_account.Id)).Should().Be(500m);
    }

    private async Task AssertMetrics(decimal expense)
    {
        var start = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var health = await _ledger.GetMonthlyHealthMetricsAsync(_user.UserId!.Value, start, start.AddMonths(1));
        health.Single().MonthlyExpenses.Should().Be(expense);
        health.Single().MonthlyIncome.Should().Be(0m);
        var legacy = await _ledger.GetMonthlyMetricsAsync(_user.UserId.Value, start, start.AddMonths(1));
        legacy.TotalExpense.Should().Be(expense);
        legacy.TotalIncome.Should().Be(0m);
        var spending = await _ledger.GetMonthlySpendingByCurrencyAsync(_user.UserId.Value, start, start.AddMonths(1));
        spending.Sum(x => x.TotalExpenses).Should().Be(expense);
        spending.SelectMany(x => x.ExpensesByCategory).Sum(x => x.Amount).Should().Be(expense);
    }

    private SharedExpenseLedgerRequestDto Expense() => new(_user.UserId!.Value, _account.Id, 100m, "USD", _category.Id, _clock.UtcNow, "Shared expense");
    private SettlementLegRequestDto Leg(string direction, decimal amount) => new(_user.UserId!.Value, _account.Id, amount, "USD", direction,
        Guid.NewGuid(), _clock.UtcNow, "Settlement");
    private static MovementRepositoryQuery Query(string? type) => new(null, null, null, null, type, null, false, 1, 100);

    private sealed class TestUser : ICurrentUserContext
    {
        public Guid? UserId { get; } = Guid.NewGuid();
    }

    private sealed class TestClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly TodayUtc => DateOnly.FromDateTime(UtcNow);
    }

    private sealed class TestRates : IRateSnapshotProvider
    {
        public Task<RateSnapshotDto?> GetSnapshotAsync(string fromCurrency, string toCurrency, Guid? userId = null, CancellationToken cancellationToken = default) =>
            Task.FromResult<RateSnapshotDto?>(new RateSnapshotDto(7m, "Test snapshot", new TestClock().UtcNow, false));
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
