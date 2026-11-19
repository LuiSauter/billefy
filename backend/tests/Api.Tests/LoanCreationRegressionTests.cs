using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BuildingBlocks.Time;
using FluentAssertions;
using Ledger.Application.Accounts.Services;
using Ledger.Application.Transactions.Services;
using Ledger.Domain.Accounts;
using Lending.Contracts;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Api.Tests;

public sealed class LoanCreationRegressionTests
{
    [Fact]
    public async Task CreateBorrowedLoan_ReportedRequest_PersistsScheduleAndDisbursementThroughHttp()
    {
        using var factory = new CustomWebApplicationFactory(configureServices: services =>
            services.Replace(ServiceDescriptor.Singleton<IClock>(new FixedClock())));
        using var testFactory = factory.WithWebHostBuilder(builder => builder.UseEnvironment("Testing"));
        using var client = testFactory.CreateClient();
        client.DefaultRequestHeaders.Add("X-User-Id", Guid.NewGuid().ToString());

        using var accountResponse = await client.PostAsJsonAsync("/v1/accounts",
            new CreateAccountRequest("Synthetic loan regression account", AccountType.Bank, "BOB"));
        accountResponse.StatusCode.Should().Be(HttpStatusCode.Created,
            "account response: {0}", await accountResponse.Content.ReadAsStringAsync());
        using var accountJson = await JsonDocument.ParseAsync(await accountResponse.Content.ReadAsStreamAsync());
        var accountId = accountJson.RootElement.GetProperty("id").GetGuid();

        // Keep the reported wire shape: omitted fields must exercise API defaults,
        // and the interest rate must remain the exact JSON number 0.08.
        using var payload = new StringContent($$"""
            {
              "type": "Borrowed",
              "counterpartyName": "Synthetic regression counterparty",
              "principal": 2000,
              "currency": "BOB",
              "interestRate": 0.08,
              "rateUnit": "Annual",
              "frequency": "Monthly",
              "template": "FixedInstallment",
              "totalInstallments": 12,
              "disbursementDate": "2026-11-15",
              "disbursementAccountId": "{{accountId}}",
              "counterpartyNotes": "Synthetic regression notes",
              "earlyPaymentPolicy": "AdvanceInstallments"
            }
            """, Encoding.UTF8, "application/json");
        using var loanResponse = await client.PostAsync("/v1/loans", payload);

        loanResponse.StatusCode.Should().Be(HttpStatusCode.Created,
            "loan response: {0}", await loanResponse.Content.ReadAsStringAsync());
        using var loanJson = await JsonDocument.ParseAsync(await loanResponse.Content.ReadAsStreamAsync());
        var loanId = loanJson.RootElement.GetProperty("id").GetGuid();
        loanResponse.Headers.Location.Should().Be(new Uri($"/v1/loans/{loanId}", UriKind.Relative));

        using var detailResponse = await client.GetAsync($"/v1/loans/{loanId}");
        detailResponse.StatusCode.Should().Be(HttpStatusCode.OK,
            "detail response: {0}", await detailResponse.Content.ReadAsStringAsync());
        var detail = (await detailResponse.Content.ReadFromJsonAsync<LoanDetailDto>())!;
        detail.Summary.Id.Should().Be(loanId);
        detail.Summary.Type.Should().Be("Borrowed");
        detail.Summary.Template.Should().Be("FixedInstallment");
        detail.Summary.Principal.Should().Be(2000m);
        detail.Summary.Currency.Should().Be("BOB");
        detail.Summary.InterestRate.Should().Be(0.08m);
        detail.Summary.CounterpartyName.Should().Be("Synthetic regression counterparty");
        detail.Summary.Status.Should().Be("Active");
        detail.Summary.DisbursementDate.Should().Be(new DateOnly(2026, 11, 15));
        detail.Summary.FirstDueDate.Should().Be(new DateOnly(2026, 12, 15));
        detail.Summary.TotalInstallments.Should().Be(12);
        detail.Summary.RemainingPrincipal.Should().Be(2000m);
        detail.Summary.EarlyPaymentPolicy.Should().Be("AdvanceInstallments");
        // This public eligibility check validates the stored disbursement link.
        detail.Summary.CancellationEligibility.CanCancel.Should().BeTrue();
        detail.Summary.CancellationEligibility.ReasonCode.Should().BeNull();
        detail.Payments.Should().BeEmpty();
        detail.Installments.Should().HaveCount(12);
        detail.Installments.Select(i => i.Number).Should().Equal(Enumerable.Range(1, 12));
        detail.Installments.Select(i => i.DueDate).Should().Equal(
            Enumerable.Range(1, 12).Select(month => new DateOnly(2026, 11, 15).AddMonths(month)));
        detail.Installments.Sum(i => i.ExpectedPrincipal).Should().Be(2000m);
        detail.Installments[0].ExpectedInterest.Should().Be(13.33m);
        detail.Installments.Sum(i => i.RemainingPrincipal).Should().Be(2000m);
        detail.Installments.Should().OnlyContain(i =>
            i.ExpectedTotal == i.ExpectedPrincipal + i.ExpectedInterest &&
            i.PaidPrincipal == 0m && i.PaidInterest == 0m && i.PaidLateInterest == 0m);
        detail.Summary.TotalPayoff.Should().Be(detail.Installments.Sum(i => i.ExpectedTotal));
        detail.Summary.TotalPayoff.Should().BeGreaterThan(2000m);
        detail.Summary.SuggestedAmount.Should().Be(detail.Installments[0].ExpectedTotal);

        using var transactionsResponse = await client.GetAsync($"/v1/transactions?accountId={accountId}");
        transactionsResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var transactions = (await transactionsResponse.Content.ReadFromJsonAsync<TransactionDto[]>())!;
        var income = transactions.Should().ContainSingle().Subject;
        income.Id.Should().NotBeEmpty();
        income.AccountId.Should().Be(accountId);
        income.Direction.Should().Be("Income");
        income.Amount.Should().Be(2000m);
        income.Currency.Should().Be("BOB");
        income.OccurredAt.Should().Be(new DateTime(2026, 11, 15, 0, 0, 0, DateTimeKind.Utc));
        income.Description.Should().Be("Loan disbursement from Synthetic regression counterparty");
        income.ReversesId.Should().BeNull();

        using var accountsResponse = await client.GetAsync("/v1/accounts");
        accountsResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var accounts = (await accountsResponse.Content.ReadFromJsonAsync<AccountDto[]>())!;
        var account = accounts.Should().ContainSingle().Subject;
        account.Id.Should().Be(accountId);
        account.Currency.Should().Be("BOB");
        account.Balance.Should().Be(2000m);
    }

    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 11, 15, 0, 0, 0, DateTimeKind.Utc);
        public DateOnly TodayUtc => new(2026, 11, 15);
    }
}
