using Api.Endpoints;
using Api.Infrastructure.Transactions;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.ValueObjects;
using Ledger.Application.Accounts.Services;
using FluentAssertions;
using Ledger.Domain.Accounts;
using Ledger.Domain.Transactions;
using Lending.Domain.Entities;
using Lending.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Metadata;
using Lending.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Lending.Contracts;

namespace Api.Tests;

public class LoanTransactionTests
{
    [Fact]
    public void LendingModel_HasNoPendingMigrationChanges()
    {
        var options = new DbContextOptionsBuilder<LendingDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=model-snapshot-check;Username=none;Password=none")
            .Options;
        using var context = new LendingDbContext(options, new SnapshotTestUserContext());
        var snapshot = context.GetService<IMigrationsAssembly>().ModelSnapshot!.Model;
        var snapshotRuntimeModel = context.GetService<IModelRuntimeInitializer>().Initialize(snapshot, designTime: true);
        var differ = context.GetService<IMigrationsModelDiffer>();

        var currentDesignModel = context.GetService<IDesignTimeModel>().Model;
        differ.HasDifferences(snapshotRuntimeModel.GetRelationalModel(), currentDesignModel.GetRelationalModel()).Should().BeFalse();
    }

    [Fact]
    public async Task CreateLoanEndpoint_PersistsExactLedgerDisbursementTransactionId()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();

        using var accountRequest = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
        {
            Content = JsonContent.Create(new CreateAccountRequest("Loan account", AccountType.Bank, "USD"))
        };
        accountRequest.Headers.Add("X-User-Id", userId.ToString());
        using var accountResponse = await client.SendAsync(accountRequest);
        accountResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        using var accountJson = await JsonDocument.ParseAsync(await accountResponse.Content.ReadAsStreamAsync());
        var accountId = accountJson.RootElement.GetProperty("id").GetGuid();

        using var loanRequest = new HttpRequestMessage(HttpMethod.Post, "/v1/loans")
        {
            Content = JsonContent.Create(new CreateLoanRequest(
                CounterpartyName: "Loan linkage test",
                Type: "Lent",
                Template: "NoInterest",
                Principal: 100m,
                Currency: "USD",
                InterestRate: 0m,
                TotalInstallments: 1,
                DisbursementDate: new DateOnly(2026, 1, 1),
                DisbursementAccountId: accountId))
        };
        loanRequest.Headers.Add("X-User-Id", userId.ToString());
        using var loanResponse = await client.SendAsync(loanRequest);
        loanResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        using var loanJson = await JsonDocument.ParseAsync(await loanResponse.Content.ReadAsStreamAsync());
        var loanId = loanJson.RootElement.GetProperty("id").GetGuid();

        using var scope = factory.Services.CreateScope();
        var lendingDb = scope.ServiceProvider.GetRequiredService<Lending.Infrastructure.LendingDbContext>();
        var ledgerDb = scope.ServiceProvider.GetRequiredService<Ledger.Infrastructure.LedgerDbContext>();
        var persistedLoan = await lendingDb.Loans.IgnoreQueryFilters().AsNoTracking().SingleAsync(l => l.Id == loanId);
        var persistedTransaction = await ledgerDb.Transactions.IgnoreQueryFilters().AsNoTracking()
            .SingleAsync(t => t.Id == persistedLoan.DisbursementTransactionId);

        persistedLoan.DisbursementAccountId.Should().Be(accountId);
        persistedLoan.DisbursementTransactionId.Should().Be(persistedTransaction.Id);
    }

    [Fact]
    public async Task LedgerDatabase_AllowsOnlyOneReversalPerOriginalTransaction()
    {
        await using var factory = new LoanTransactionTestFactory();
        await factory.InitializeAsync();
        var account = Account.Create(factory.UserId, "Reversal uniqueness", AccountType.Bank, Currency.USD, Money.Zero(Currency.USD), DateTime.UtcNow);
        var original = Transaction.Create(factory.UserId, account.Id, Money.Of(25m, Currency.USD), TransactionDirection.Expense,
            null, DateTime.UtcNow, "Synthetic original");
        factory.LedgerDb.Accounts.Add(account);
        factory.LedgerDb.Transactions.Add(original);
        await factory.LedgerDb.SaveChangesAsync();
        factory.LedgerDb.Transactions.Add(Transaction.CreateReversal(original, DateTime.UtcNow));
        await factory.LedgerDb.SaveChangesAsync();
        factory.LedgerDb.ChangeTracker.Clear();
        factory.LedgerDb.Transactions.Add(Transaction.CreateReversal(original, DateTime.UtcNow));

        var act = () => factory.LedgerDb.SaveChangesAsync();

        await act.Should().ThrowAsync<DbUpdateException>();
        (await factory.LedgerDb.Transactions.AsNoTracking().IgnoreQueryFilters().CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task ExecuteAsync_RollsBackSavedLedgerAndLendingEntitiesAndLeavesConnectionsUsable()
    {
        await using var factory = new LoanTransactionTestFactory();
        await factory.InitializeAsync();
        var transaction = new RelationalLoanTransaction(factory.LendingDb, factory.LedgerDb);
        var ledgerConnection = factory.LedgerDb.Database.GetDbConnection();
        var lendingConnection = factory.LendingDb.Database.GetDbConnection();
        var (account, ledgerTransaction, loan) = CreateEntities(factory.UserId);

        var act = () => transaction.ExecuteAsync(async cancellationToken =>
        {
            factory.LedgerDb.Accounts.Add(account);
            factory.LedgerDb.Transactions.Add(ledgerTransaction);
            await factory.LedgerDb.SaveChangesAsync(cancellationToken);

            factory.LendingDb.Loans.Add(loan);
            await factory.LendingDb.SaveChangesAsync(cancellationToken);
            throw new InvalidOperationException("Simulated failure after both EF saves.");
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Simulated failure after both EF saves.");

        (await factory.LedgerDb.Accounts.AsNoTracking().IgnoreQueryFilters().CountAsync()).Should().Be(0);
        (await factory.LedgerDb.Transactions.AsNoTracking().IgnoreQueryFilters().CountAsync()).Should().Be(0);
        (await factory.LendingDb.Loans.AsNoTracking().IgnoreQueryFilters().CountAsync()).Should().Be(0);
        AssertConnectionsUnchangedAndUsable(factory, ledgerConnection, lendingConnection);
    }

    [Fact]
    public async Task ExecuteAsync_CommitsTrackedEntitiesAndPersistsExactDisbursementLink()
    {
        await using var factory = new LoanTransactionTestFactory();
        await factory.InitializeAsync();
        var transaction = new RelationalLoanTransaction(factory.LendingDb, factory.LedgerDb);
        var ledgerConnection = factory.LedgerDb.Database.GetDbConnection();
        var lendingConnection = factory.LendingDb.Database.GetDbConnection();
        var (account, ledgerTransaction, loan) = CreateEntities(factory.UserId);

        await transaction.ExecuteAsync(async cancellationToken =>
        {
            factory.LedgerDb.Accounts.Add(account);
            factory.LedgerDb.Transactions.Add(ledgerTransaction);
            await factory.LedgerDb.SaveChangesAsync(cancellationToken);

            factory.LendingDb.Loans.Add(loan);
            await factory.LendingDb.SaveChangesAsync(cancellationToken);
        });

        var persistedLoan = await factory.LendingDb.Loans.AsNoTracking().SingleAsync(l => l.Id == loan.Id);
        var persistedTransaction = await factory.LedgerDb.Transactions.AsNoTracking()
            .SingleAsync(t => t.Id == ledgerTransaction.Id);
        persistedLoan.DisbursementTransactionId.Should().Be(persistedTransaction.Id);
        persistedLoan.DisbursementAccountId.Should().Be(account.Id);
        AssertConnectionsUnchangedAndUsable(factory, ledgerConnection, lendingConnection);
    }

    private sealed class SnapshotTestUserContext : ICurrentUserContext
    {
        public Guid? UserId { get; } = Guid.NewGuid();
    }

    private static (Account Account, Transaction Transaction, Loan Loan) CreateEntities(Guid userId)
    {
        var account = Account.Create(
            userId,
            "Loan test account",
            AccountType.Bank,
            Currency.USD,
            Money.Zero(Currency.USD),
            DateTime.UtcNow);
        var transaction = Transaction.Create(
            userId,
            account.Id,
            Money.Of(100m, Currency.USD),
            TransactionDirection.Expense,
            categoryId: null,
            DateTime.UtcNow,
            "Loan disbursement");
        var loan = Loan.Create(
            userId,
            Guid.NewGuid(),
            account.Id,
            LoanType.Lent,
            LoanTemplate.NoInterest,
            Money.Of(100m, Currency.USD),
            interestRate: 0m,
            RateUnit.Monthly,
            DayCount.Thirty360,
            PaymentFrequency.Monthly,
            totalInstallments: 1,
            new DateOnly(2026, 1, 1));
        loan.LinkDisbursementTransaction(transaction.Id);
        return (account, transaction, loan);
    }

    private static void AssertConnectionsUnchangedAndUsable(
        LoanTransactionTestFactory factory,
        System.Data.Common.DbConnection ledgerConnection,
        System.Data.Common.DbConnection lendingConnection)
    {
        factory.LedgerDb.Database.GetDbConnection().Should().BeSameAs(ledgerConnection);
        factory.LendingDb.Database.GetDbConnection().Should().BeSameAs(lendingConnection);
        ledgerConnection.State.Should().Be(System.Data.ConnectionState.Open);
        lendingConnection.State.Should().Be(System.Data.ConnectionState.Open);
    }
}
