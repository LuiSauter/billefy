using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Ledger.Application.Accounts.Services;
using Ledger.Infrastructure;
using Lending.Application.Abstractions;
using Lending.Contracts;
using Lending.Domain.Engine.DynamicPayments;
using Lending.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using BuildingBlocks.Time;

namespace Api.Tests;

public sealed class LoanCancellationIntegrationTests
{
    [Fact]
    public async Task CancelLoan_WithoutAccount_ChangesStatusWithoutLedgerMovement()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var loanId = await CreateLoan(client, userId, "Lent", null);

        using var response = await Send(client, HttpMethod.Post, $"/v1/loans/{loanId}/cancel", userId);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        body.RootElement.GetProperty("status").GetString().Should().Be("Cancelled");
        body.RootElement.GetProperty("reversalTransactionId").ValueKind.Should().Be(JsonValueKind.Null);
        using var scope = factory.Services.CreateScope();
        var ledger = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
        (await ledger.Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(0);
    }

    [Theory]
    [InlineData("Lent", "Expense")]
    [InlineData("Borrowed", "Income")]
    public async Task CancelLoan_WithLinkedDisbursement_ReversesExactlyOnceAndRetryIsStable(string type, string originalDirection)
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var accountId = await CreateAccount(client, userId);
        var loanId = await CreateLoan(client, userId, type, accountId);

        using var firstResponse = await Send(client, HttpMethod.Post, $"/v1/loans/{loanId}/cancel", userId);
        firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var firstJson = await JsonDocument.ParseAsync(await firstResponse.Content.ReadAsStreamAsync());
        var reversalId = firstJson.RootElement.GetProperty("reversalTransactionId").GetGuid();

        using var retryResponse = await Send(client, HttpMethod.Post, $"/v1/loans/{loanId}/cancel", userId);
        retryResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var retryJson = await JsonDocument.ParseAsync(await retryResponse.Content.ReadAsStreamAsync());
        retryJson.RootElement.GetProperty("reversalTransactionId").GetGuid().Should().Be(reversalId);

        using var scope = factory.Services.CreateScope();
        var ledger = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
        var transactions = await ledger.Transactions.IgnoreQueryFilters().OrderBy(t => t.CreatedAt).ToListAsync();
        transactions.Should().HaveCount(2);
        transactions[0].Direction.ToString().Should().Be(originalDirection);
        transactions[1].Id.Should().Be(reversalId);
        transactions[1].ReversesId.Should().Be(transactions[0].Id);
        transactions[1].AccountId.Should().Be(accountId);
        transactions[1].Amount.Should().Be(transactions[0].Amount);
        transactions[1].AppliedRate.Should().Be(transactions[0].AppliedRate);
        transactions[1].RateSource.Should().Be(transactions[0].RateSource);
        var accounts = await ledger.Accounts.IgnoreQueryFilters().ToListAsync();
        var restoredBalance = (await ledger.Transactions.IgnoreQueryFilters().Where(t => t.AccountId == accountId).ToListAsync())
            .Sum(t => t.Direction == Ledger.Domain.Transactions.TransactionDirection.Income ? t.Amount.Amount : -t.Amount.Amount);
        restoredBalance.Should().Be(accounts.Single(a => a.Id == accountId).InitialBalance.Amount);
        var loan = await scope.ServiceProvider.GetRequiredService<LendingDbContext>().Loans.IgnoreQueryFilters()
            .Include(l => l.Installments).SingleAsync(l => l.Id == loanId);
        loan.DisbursementTransactionId.Should().Be(transactions[0].Id);
        loan.DisbursementReversalTransactionId.Should().Be(reversalId);
        loan.Installments.Should().ContainSingle();
    }

    [Fact]
    public async Task CancelLoan_WrongOwner_ReturnsNotFoundWithoutChanges()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var ownerId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var accountId = await CreateAccount(client, ownerId);
        var loanId = await CreateLoan(client, ownerId, "Lent", accountId);

        using var response = await Send(client, HttpMethod.Post, $"/v1/loans/{loanId}/cancel", otherUserId);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var scope = factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<LedgerDbContext>().Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(1);
        (await scope.ServiceProvider.GetRequiredService<LendingDbContext>().Loans.IgnoreQueryFilters().SingleAsync(l => l.Id == loanId))
            .Status.ToString().Should().Be("Active");
    }

    [Theory]
    [InlineData(1)]
    [InlineData(100)]
    public async Task CancelLoan_WithAnyRecordedPayment_IsRejectedAndEligibilityIsAuthoritative(int paymentAmount)
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var loanId = await CreateLoan(client, userId, "Lent", null);
        using var paymentResponse = await SendJson(client, HttpMethod.Post, $"/v1/loans/{loanId}/payments",
            new RegisterLoanPaymentRequest(paymentAmount), userId);
        paymentResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var response = await Send(client, HttpMethod.Post, $"/v1/loans/{loanId}/cancel", userId);
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        using var error = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        error.RootElement.GetProperty("title").GetString().Should().Be("Loan.HasPayments");

        using var detailResponse = await Send(client, HttpMethod.Get, $"/v1/loans/{loanId}", userId);
        using var detail = await JsonDocument.ParseAsync(await detailResponse.Content.ReadAsStreamAsync());
        detail.RootElement.GetProperty("summary").GetProperty("cancellationEligibility").GetProperty("reasonCode")
            .GetString().Should().Be("HasPayments");
        using var listResponse = await Send(client, HttpMethod.Get, "/v1/loans", userId);
        using var list = await JsonDocument.ParseAsync(await listResponse.Content.ReadAsStreamAsync());
        list.RootElement[0].GetProperty("cancellationEligibility").GetProperty("reasonCode").GetString().Should().Be("HasPayments");
    }

    [Fact]
    public async Task CancelLoan_LegacyDisbursementWithoutExactLink_IsBlocked()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var accountId = await CreateAccount(client, userId);
        var loanId = await CreateLoan(client, userId, "Lent", accountId);
        using (var scope = factory.Services.CreateScope())
        {
            var lending = scope.ServiceProvider.GetRequiredService<LendingDbContext>();
            await lending.Database.ExecuteSqlInterpolatedAsync($"UPDATE loans SET disbursement_transaction_id = NULL WHERE id = {loanId}");
        }

        using var response = await Send(client, HttpMethod.Post, $"/v1/loans/{loanId}/cancel", userId);
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        using var error = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        error.RootElement.GetProperty("title").GetString().Should().Be("Loan.LegacyDisbursementUnlinked");
        using var scopeAfter = factory.Services.CreateScope();
        (await scopeAfter.ServiceProvider.GetRequiredService<LedgerDbContext>().Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task CancelLoan_MismatchedLinkedTransaction_FailsSafely()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var accountId = await CreateAccount(client, userId);
        var loanId = await CreateLoan(client, userId, "Lent", accountId);
        using (var scope = factory.Services.CreateScope())
        {
            var lending = scope.ServiceProvider.GetRequiredService<LendingDbContext>();
            var ledger = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
            var transactionId = (await lending.Loans.IgnoreQueryFilters().SingleAsync(l => l.Id == loanId)).DisbursementTransactionId!.Value;
            await ledger.Database.ExecuteSqlInterpolatedAsync($"UPDATE transactions SET amount = 99 WHERE id = {transactionId}");
        }

        using var response = await Send(client, HttpMethod.Post, $"/v1/loans/{loanId}/cancel", userId);
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        using var error = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        error.RootElement.GetProperty("title").GetString().Should().Be("Loan.DisbursementMismatch");
        using var scopeAfter = factory.Services.CreateScope();
        (await scopeAfter.ServiceProvider.GetRequiredService<LedgerDbContext>().Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task CancelLoan_AlreadyReversedThroughGenericLedger_FailsWithoutDuplicate()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var accountId = await CreateAccount(client, userId);
        var loanId = await CreateLoan(client, userId, "Lent", accountId);
        Guid transactionId;
        using (var scope = factory.Services.CreateScope())
            transactionId = (await scope.ServiceProvider.GetRequiredService<LendingDbContext>().Loans.IgnoreQueryFilters().SingleAsync(l => l.Id == loanId)).DisbursementTransactionId!.Value;
        using var genericReverse = await SendJson(client, HttpMethod.Post, $"/v1/transactions/{transactionId}/reverse", new { reason = "synthetic test" }, userId);
        genericReverse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var duplicateReverse = await SendJson(client, HttpMethod.Post, $"/v1/transactions/{transactionId}/reverse", new { reason = "duplicate test" }, userId);
        duplicateReverse.StatusCode.Should().Be(HttpStatusCode.Conflict);

        using var detailResponse = await Send(client, HttpMethod.Get, $"/v1/loans/{loanId}", userId);
        using var detail = await JsonDocument.ParseAsync(await detailResponse.Content.ReadAsStreamAsync());
        detail.RootElement.GetProperty("summary").GetProperty("cancellationEligibility").GetProperty("reasonCode")
            .GetString().Should().Be("DisbursementAlreadyReversed");

        using var response = await Send(client, HttpMethod.Post, $"/v1/loans/{loanId}/cancel", userId);
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        using var scopeAfter = factory.Services.CreateScope();
        (await scopeAfter.ServiceProvider.GetRequiredService<LedgerDbContext>().Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task CancelLoan_LendingSaveFailureRollsBackLedgerReversal()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var accountId = await CreateAccount(client, userId);
        var loanId = await CreateLoan(client, userId, "Borrowed", accountId);
        using (var scope = factory.Services.CreateScope())
        {
            var lending = scope.ServiceProvider.GetRequiredService<LendingDbContext>();
            await lending.Database.ExecuteSqlRawAsync("CREATE TRIGGER fail_loan_cancel BEFORE UPDATE OF status ON loans BEGIN SELECT RAISE(ABORT, 'synthetic cancellation failure'); END;");
        }

        using var failedResponse = await Send(client, HttpMethod.Post, $"/v1/loans/{loanId}/cancel", userId);
        failedResponse.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        using (var scope = factory.Services.CreateScope())
        {
            var ledger = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
            var lending = scope.ServiceProvider.GetRequiredService<LendingDbContext>();
            (await ledger.Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(1);
            (await lending.Loans.IgnoreQueryFilters().SingleAsync(l => l.Id == loanId)).Status.ToString().Should().Be("Active");
            await lending.Database.ExecuteSqlRawAsync("DROP TRIGGER fail_loan_cancel;");
        }

        using var retryResponse = await Send(client, HttpMethod.Post, $"/v1/loans/{loanId}/cancel", userId);
        retryResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CancelLoan_BorrowedDebtIsRemovedFromActiveLiabilityAggregate()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var accountId = await CreateAccount(client, userId);
        var loanId = await CreateLoan(client, userId, "Borrowed", accountId);
        using var scopeBefore = factory.Services.CreateScope();
        var lendingModule = scopeBefore.ServiceProvider.GetRequiredService<Lending.Contracts.ILendingModule>();
        (await lendingModule.GetTotalDebtLiabilitiesAsync(userId)).Should().Be(100m);
        scopeBefore.Dispose();

        using var response = await Send(client, HttpMethod.Post, $"/v1/loans/{loanId}/cancel", userId);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var scopeAfter = factory.Services.CreateScope();
        (await scopeAfter.ServiceProvider.GetRequiredService<Lending.Contracts.ILendingModule>().GetTotalDebtLiabilitiesAsync(userId)).Should().Be(0m);
    }

    [Fact]
    public async Task RegisterPayment_RawDateOnlyWithAccountPersistsUtcLinkedIncome()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var accountId = await CreateAccount(client, userId);
        var loanId = await CreateLoan(client, userId, "Lent", null);
        using var request = new HttpRequestMessage(HttpMethod.Post, $"/v1/loans/{loanId}/payments")
        {
            Content = new StringContent($"{{\"amount\":25,\"paymentDate\":\"2026-11-11\",\"accountId\":\"{accountId}\"}}", System.Text.Encoding.UTF8, "application/json")
        };
        request.Headers.Add("X-User-Id", userId.ToString());
        using var response = await client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = factory.Services.CreateScope();
        var ledger = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
        var lending = scope.ServiceProvider.GetRequiredService<LendingDbContext>();
        var posted = await ledger.Transactions.IgnoreQueryFilters().SingleAsync();
        posted.Direction.ToString().Should().Be("Income");
        posted.AccountId.Should().Be(accountId);
        posted.OccurredAt.Should().Be(new DateTime(2026, 11, 11, 0, 0, 0));
        var payment = await lending.Payments.IgnoreQueryFilters().SingleAsync();
        payment.PaymentDate.Should().Be(new DateTime(2026, 11, 11, 0, 0, 0));
        payment.LedgerTransactionId.Should().Be(posted.Id);
    }

    [Theory]
    [InlineData("{\"amount\":25}", "2026-11-11")]
    [InlineData("{\"amount\":25,\"paymentDate\":\"2026-11-11T00:00:00Z\"}", "2026-11-11")]
    [InlineData("{\"amount\":25,\"paymentDate\":\"2026-11-11T03:00:00+03:00\"}", "2026-11-11")]
    public async Task RegisterPayment_DateVariantsWithoutAccountPersistCalendarDate(string json, string expectedDate)
    {
        using var factory = new CustomWebApplicationFactory(configureServices: services =>
            services.Replace(ServiceDescriptor.Singleton<IClock>(new FixedClock(new DateTime(2026, 11, 11, 0, 0, 0, DateTimeKind.Utc)))));
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var loanId = await CreateLoan(client, userId, "Lent", null);
        using var request = new HttpRequestMessage(HttpMethod.Post, $"/v1/loans/{loanId}/payments")
        {
            Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
        };
        request.Headers.Add("X-User-Id", userId.ToString());
        using var response = await client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var scope = factory.Services.CreateScope();
        var payment = await scope.ServiceProvider.GetRequiredService<LendingDbContext>().Payments.IgnoreQueryFilters().SingleAsync();
        payment.AccountId.Should().BeNull();
        payment.PaymentDate.Date.Should().Be(DateTime.Parse(expectedDate).Date);
        (await scope.ServiceProvider.GetRequiredService<LedgerDbContext>().Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task RegisterPayment_RejectsForeignCurrencyMismatchAndArchivedAccountsWithoutPosting()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var ownerId = Guid.NewGuid();
        var foreignUserId = Guid.NewGuid();
        var loanId = await CreateLoan(client, ownerId, "Lent", null);
        var foreignAccountId = await CreateAccount(client, foreignUserId);
        var mismatchedAccountId = await CreateAccount(client, ownerId, "BOB");
        var archivedAccountId = await CreateAccount(client, ownerId);
        using (var seed = await SendJson(client, HttpMethod.Post, "/v1/transactions",
            new { AccountId = archivedAccountId, Amount = 1m, Direction = "Expense", Description = "Archive account" }, ownerId))
            seed.StatusCode.Should().Be(HttpStatusCode.Created);
        using (var archive = await Send(client, HttpMethod.Delete, $"/v1/accounts/{archivedAccountId}", ownerId))
            archive.StatusCode.Should().Be(HttpStatusCode.NoContent);

        foreach (var accountId in new[] { foreignAccountId, mismatchedAccountId, archivedAccountId })
        {
            using var response = await SendJson(client, HttpMethod.Post, $"/v1/loans/{loanId}/payments",
                new RegisterLoanPaymentRequest(10m, AccountId: accountId), ownerId);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.BadRequest, HttpStatusCode.Conflict);
        }
        using var scope = factory.Services.CreateScope();
        var ledger = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
        var lending = scope.ServiceProvider.GetRequiredService<LendingDbContext>();
        (await ledger.Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(1);
        (await lending.Payments.IgnoreQueryFilters().CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task CreateLoan_MismatchedDisbursementAccountCurrency_ReturnsBadRequest()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var bobAccountId = await CreateAccount(client, userId, "BOB");

        using var response = await SendJson(client, HttpMethod.Post, "/v1/loans",
            new CreateLoanRequest("Disbursement mismatch counterparty", "Lent", "NoInterest", 100m, "USD", 0m,
                TotalInstallments: 1, DisbursementDate: new DateOnly(2026, 1, 1), DisbursementAccountId: bobAccountId), userId);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadAsStringAsync();
        problem.Should().Contain("Account.CurrencyMismatch");
    }

    [Fact]
    public async Task RegisterPayment_OverpaymentWithAccountRollsBackLedgerAndRetrySucceeds()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var accountId = await CreateAccount(client, userId);
        var loanId = await CreateLoan(client, userId, "Lent", null);
        using var rejected = await SendJson(client, HttpMethod.Post, $"/v1/loans/{loanId}/payments",
            new RegisterLoanPaymentRequest(101m, AccountId: accountId), userId);
        rejected.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.UnprocessableEntity);
        using (var scope = factory.Services.CreateScope())
        {
            var ledger = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
            var lending = scope.ServiceProvider.GetRequiredService<LendingDbContext>();
            (await ledger.Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(0);
            var loan = await lending.Loans.IgnoreQueryFilters().Include(l => l.Installments).SingleAsync(l => l.Id == loanId);
            loan.Payments.Should().BeEmpty();
            loan.Installments.Single().PaidPrincipal.Should().Be(0m);
        }
        using var retry = await SendJson(client, HttpMethod.Post, $"/v1/loans/{loanId}/payments",
            new RegisterLoanPaymentRequest(25m, AccountId: accountId), userId);
        retry.StatusCode.Should().Be(HttpStatusCode.OK);
        using var finalScope = factory.Services.CreateScope();
        (await finalScope.ServiceProvider.GetRequiredService<LedgerDbContext>().Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(1);
        (await finalScope.ServiceProvider.GetRequiredService<LendingDbContext>().Payments.IgnoreQueryFilters().CountAsync()).Should().Be(1);
    }

    [Theory]
    [InlineData(1.0000001, null)]
    [InlineData(1, "501")]
    public async Task RegisterPayment_RejectsInvalidPrecisionAndLongNotes(decimal amount, string? noteLength)
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var loanId = await CreateLoan(client, userId, "Lent", null);
        var note = noteLength is null ? null : new string('x', int.Parse(noteLength));
        using var response = await SendJson(client, HttpMethod.Post, $"/v1/loans/{loanId}/payments",
            new RegisterLoanPaymentRequest(amount, Note: note), userId);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var scope = factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<LendingDbContext>().Payments.IgnoreQueryFilters().CountAsync()).Should().Be(0);
    }

    [Theory]
    [InlineData("Lent", "Income")]
    [InlineData("Borrowed", "Expense")]
    public async Task RegisterPayment_ReplaysPersistedHistoryAndListLoaderIncludesAllocations(string type, string direction)
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();
        var accountId = await CreateAccount(client, userId);
        var loanId = await CreateLoan(client, userId, type, null);
        var firstDate = new DateTime(2026, 2, 11, 0, 0, 0, DateTimeKind.Utc);
        using var first = await SendJson(client, HttpMethod.Post, $"/v1/loans/{loanId}/payments",
            new RegisterLoanPaymentRequest(25m, firstDate, accountId), userId);
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        using var rejected = await SendJson(client, HttpMethod.Post, $"/v1/loans/{loanId}/payments",
            new RegisterLoanPaymentRequest(25m, firstDate.AddDays(-1), accountId), userId);
        rejected.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.UnprocessableEntity);
        using var payoff = await SendJson(client, HttpMethod.Post, $"/v1/loans/{loanId}/payments",
            new RegisterLoanPaymentRequest(75m, firstDate.AddDays(1), accountId), userId);
        payoff.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = factory.Services.CreateScope();
        var loans = await scope.ServiceProvider.GetRequiredService<ILoanRepository>().GetByUserIdAsync(userId);
        var loan = loans.Should().ContainSingle().Subject;
        loan.Id.Should().Be(loanId);
        var payments = loan.Payments.OrderBy(p => p.RecordSequence).ToArray();
        payments.Select(p => p.RecordSequence).Should().Equal(1L, 2L);
        payments.Should().OnlyContain(p => p.CalculationVersion == 1
            && p.EarlyPrincipalAmount == null && p.EarlyPrincipalEffectiveDate == null);
        payments.Select(p => p.Allocations.Single().ToPrincipal).Should().Equal(25m, 75m);
        loan.Status.ToString().Should().Be("Paid");
        loan.RemainingPrincipal.Should().Be(0m);
        loan.ClosedAt.Should().Be(firstDate.AddDays(1));
        var replay = LoanPaymentCalculationAdapter.Calculate(loan, new DateOnly(2026, 2, 12));
        replay.TotalPayoff.Should().Be(0m);
        replay.HistoricalSnapshots.Select(s => s.RemainingTotal).Should().Equal(75m, 0m);
        var transactions = await scope.ServiceProvider.GetRequiredService<LedgerDbContext>()
            .Transactions.IgnoreQueryFilters().ToListAsync();
        transactions.Should().HaveCount(2).And.OnlyContain(t => t.Direction.ToString() == direction);
        transactions.Select(t => t.Id).Should().BeEquivalentTo(payments.Select(p => p.LedgerTransactionId!.Value));
    }

    private static async Task<Guid> CreateAccount(HttpClient client, Guid userId, string currency = "USD")
    {
        using var response = await SendJson(client, HttpMethod.Post, "/v1/accounts",
            new CreateAccountRequest("Cancellation test", Ledger.Domain.Accounts.AccountType.Bank, currency), userId);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        return body.RootElement.GetProperty("id").GetGuid();
    }

    private static async Task<Guid> CreateLoan(HttpClient client, Guid userId, string type, Guid? accountId)
    {
        using var response = await SendJson(client, HttpMethod.Post, "/v1/loans",
            new CreateLoanRequest("Synthetic counterparty", type, "NoInterest", 100m, "USD", 0m,
                TotalInstallments: 1, DisbursementDate: new DateOnly(2026, 1, 1), DisbursementAccountId: accountId), userId);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        return body.RootElement.GetProperty("id").GetGuid();
    }

    private static Task<HttpResponseMessage> Send(HttpClient client, HttpMethod method, string path, Guid userId) =>
        SendJson(client, method, path, content: null, userId);

    private static Task<HttpResponseMessage> SendJson(HttpClient client, HttpMethod method, string path, object? content, Guid userId)
    {
        var request = new HttpRequestMessage(method, path);
        if (content is not null) request.Content = JsonContent.Create(content);
        request.Headers.Add("X-User-Id", userId.ToString());
        return client.SendAsync(request);
    }

    private sealed class FixedClock(DateTime utcNow) : IClock
    {
        public DateTime UtcNow => utcNow;
        public DateOnly TodayUtc => DateOnly.FromDateTime(utcNow);
    }
}
