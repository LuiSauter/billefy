using Api.Endpoints;
using Api.Infrastructure.Transactions;
using BuildingBlocks.Currencies;
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
        using var context = new Api.DesignTime.LendingDesignTimeDbContextFactory().CreateDbContext([]);
        context.Database.ProviderName.Should().Be("Npgsql.EntityFrameworkCore.PostgreSQL");
        context.Database.GetDbConnection().ConnectionString.Should().BeNullOrEmpty();
        context.Database.GetDbConnection().State.Should().Be(System.Data.ConnectionState.Closed);
        var snapshot = context.GetService<IMigrationsAssembly>().ModelSnapshot!.Model;
        var snapshotRuntimeModel = context.GetService<IModelRuntimeInitializer>().Initialize(snapshot, designTime: true);
        var differ = context.GetService<IMigrationsModelDiffer>();

        var currentDesignModel = context.GetService<IDesignTimeModel>().Model;
        differ.HasDifferences(snapshotRuntimeModel.GetRelationalModel(), currentDesignModel.GetRelationalModel()).Should().BeFalse();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task PaymentMetadata_RoundTripsExactValuesAndLegacyNulls(bool hasMetadata)
    {
        await using var factory = new LoanTransactionTestFactory();
        await factory.InitializeAsync();
        var loan = Loan.Create(factory.UserId, Guid.NewGuid(), null, LoanType.Lent, LoanTemplate.NoInterest,
            Money.Of(100m, Currency.BOB), 0m, RateUnit.Monthly, DayCount.Thirty360,
            PaymentFrequency.Monthly, 1, new DateOnly(2026, 1, 1), earlyPaymentPolicy: EarlyPaymentPolicy.ReduceInstallment);
        var date = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc);
        var amount = Money.Of(50m, Currency.BOB);
        var payment = hasMetadata
            ? new LoanPayment(Guid.NewGuid(), factory.UserId, loan.Id, null, null, amount, date, null, date,
                7, 1, 12.345678m, new DateOnly(2026, 2, 1))
            : new LoanPayment(Guid.NewGuid(), factory.UserId, loan.Id, null, null, amount, date, null, date);
        payment.AddAllocation(loan.Installments.Single().Id, 0m, 0m,
            hasMetadata ? amount.Amount - 12.345678m : amount.Amount);
        factory.LendingDb.Loans.Add(loan);
        factory.LendingDb.Payments.Add(payment);
        await factory.LendingDb.SaveChangesAsync();
        factory.LendingDb.ChangeTracker.Clear();

        var stored = await factory.LendingDb.Payments.Include(p => p.Allocations).SingleAsync(p => p.Id == payment.Id);

        stored.Should().NotBeSameAs(payment);
        stored.Should().BeEquivalentTo(payment);
        stored.RecordSequence.Should().Be(hasMetadata ? 7L : null);
        stored.CalculationVersion.Should().Be(hasMetadata ? 1 : null);
        stored.EarlyPrincipalAmount.Should().Be(hasMetadata ? 12.345678m : null);
        stored.EarlyPrincipalEffectiveDate.Should().Be(hasMetadata ? new DateOnly(2026, 2, 1) : null);
        stored.Amount.Should().Be(amount);
    }

    [Fact]
    public async Task PaymentSequence_IsUniquePerLoanButAllowsLegacyNulls()
    {
        await using var factory = new LoanTransactionTestFactory();
        await factory.InitializeAsync();
        var firstLoan = CreateEntities(factory.UserId).Loan;
        var secondLoan = CreateEntities(factory.UserId).Loan;
        factory.LendingDb.Loans.AddRange(firstLoan, secondLoan);
        var date = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc);
        LoanPayment Payment(Loan loan, long? sequence)
        {
            var payment = new LoanPayment(Guid.NewGuid(), factory.UserId, loan.Id, null, null,
                Money.Of(5m, loan.Principal.Currency), date, null, date, recordSequence: sequence);
            payment.AddAllocation(loan.Installments.Single().Id, 0m, 0m, 5m);
            return payment;
        }
        factory.LendingDb.Payments.AddRange(Payment(firstLoan, null), Payment(firstLoan, null),
            Payment(firstLoan, 1), Payment(secondLoan, 1));
        await factory.LendingDb.SaveChangesAsync();
        factory.LendingDb.ChangeTracker.Clear();
        (await factory.LendingDb.Payments.CountAsync()).Should().Be(4);
        factory.LendingDb.Payments.Add(Payment(firstLoan, 1));

        var act = () => factory.LendingDb.SaveChangesAsync();

        await act.Should().ThrowAsync<DbUpdateException>();
        factory.LendingDb.ChangeTracker.Clear();
        (await factory.LendingDb.Payments.CountAsync()).Should().Be(4);
    }

    [Fact]
    public void PaymentMetadata_ModelUsesNullableExactTypesWithoutDefaults()
    {
        using var context = new Api.DesignTime.LendingDesignTimeDbContextFactory().CreateDbContext([]);
        var entity = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(LoanPayment))!;
        var columns = new[]
        {
            (nameof(LoanPayment.RecordSequence), "record_sequence", "bigint"),
            (nameof(LoanPayment.CalculationVersion), "calculation_version", "integer"),
            (nameof(LoanPayment.EarlyPrincipalAmount), "early_principal_amount", "numeric(20,6)"),
            (nameof(LoanPayment.EarlyPrincipalEffectiveDate), "early_principal_effective_date", "date")
        };
        foreach (var (name, column, type) in columns)
        {
            var property = entity.FindProperty(name)!;
            property.IsNullable.Should().BeTrue();
            property.GetColumnName().Should().Be(column);
            property.GetColumnType().Should().Be(type);
            property.FindAnnotation(RelationalAnnotationNames.DefaultValue).Should().BeNull();
            property.GetDefaultValueSql().Should().BeNull();
        }
        entity.FindProperty(nameof(LoanPayment.EarlyPrincipalAmount))!.GetPrecision().Should().Be(20);
        entity.FindProperty(nameof(LoanPayment.EarlyPrincipalAmount))!.GetScale().Should().Be(6);
        entity.GetIndexes().Should().Contain(i => i.IsUnique
            && i.Properties.Select(p => p.Name).SequenceEqual(new[] { "LoanId", "RecordSequence" }));
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
