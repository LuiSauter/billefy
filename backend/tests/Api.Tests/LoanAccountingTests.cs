using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BuildingBlocks.Time;
using FluentAssertions;
using Ledger.Application.Accounts.Services;
using Ledger.Application.Transactions.Services;
using Ledger.Domain.Accounts;
using Lending.Contracts;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Planning.Contracts;

namespace Api.Tests;

public sealed class LoanAccountingTests
{
    [Fact]
    public async Task OpeningPrincipalDecimalString_PreservesExactHighValueCentsWithoutCashOrResult()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var response = await api.Send(HttpMethod.Post, "/v1/loans", new
        {
            counterpartyName = "Synthetic exact-decimal opening", type = "Borrowed", template = "NoInterest",
            principal = "99999999999999.99", currency = "BOB", interestRate = 0m, totalInstallments = 1,
            disbursementDate = "2027-01-01", originationKind = "OpeningBalance"
        }, HttpStatusCode.Created, Guid.NewGuid());
        (await api.Detail(response.GetProperty("id").GetGuid())).Summary.RemainingPrincipal.Should().Be(99_999_999_999_999.99m);
        await api.AssertCash(bank, 6000m);
        await api.AssertResult(0m, 0m);
        (await api.Transactions()).Should().BeEmpty();
    }

    [Fact]
    public async Task ExistingDebtOpening_Records3000PrincipalWithoutCreatingCashOrIncome()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var before = await api.State();

        var loan = await api.Loan(bank, 3000m, originationKind: "OpeningBalance");

        var detail = await api.Detail(loan);
        detail.Summary.RemainingPrincipal.Should().Be(3000m);
        detail.Payments.Should().BeEmpty();
        detail.Installments.Sum(i => i.RemainingPrincipal).Should().Be(3000m);
        await api.AssertCash(bank, 6000m);
        await api.AssertResult(0m, 0m);
        (await api.Transactions()).Should().BeEmpty();
        (await api.Accounts()).Should().BeEquivalentTo(before.Accounts);
        (await api.Loans()).Should().ContainSingle();
    }

    [Fact]
    public async Task BankDebtPayment530_Allocates500PrincipalAndRecognizesOnly30InterestExpense()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var interestCategory = await api.Category("Synthetic debt interest");
        await api.Budget(interestCategory, 50m);
        var loan = await api.Loan(null, 3000m, originationKind: "OpeningBalance",
            template: "SimpleOnBalance", rate: 0.01m, installments: 6);
        var originalSchedule = (await api.Detail(loan)).Installments;

        var payment = await api.Pay(loan, bank, 530m, interestCategory);

        payment.AmountPaid.Should().Be(530m);
        payment.RemainingPrincipal.Should().Be(2500m);
        payment.Allocations.Sum(a => a.ToPrincipal).Should().Be(500m);
        payment.Allocations.Sum(a => a.ToInterest).Should().Be(30m);
        payment.Allocations.Sum(a => a.ToLateInterest).Should().Be(0m);
        await api.AssertCash(bank, 5470m);
        await api.AssertResult(0m, 30m);
        await api.AssertResult(0m, 30m, interestCategory);
        (await api.Budgets()).Should().ContainSingle(b => b.CategoryId == interestCategory
            && b.SpentAmount == 30m && b.RemainingAmount == 20m);
        var detail = await api.Detail(loan);
        detail.Payments.Should().ContainSingle(p => p.Id == payment.PaymentId && p.Amount == 530m);
        detail.Installments.Select(i => (i.Id, i.ExpectedPrincipal, i.ExpectedInterest, i.DueDate))
            .Should().Equal(originalSchedule.Select(i => (i.Id, i.ExpectedPrincipal, i.ExpectedInterest, i.DueDate)));
    }

    [Fact]
    public async Task Received900AndRepaid100_MoveCashAndDebtWithoutRecognizingIncomeOrExpense()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);

        var loan = await api.Loan(bank, 900m);

        await api.AssertCash(bank, 6900m);
        (await api.Detail(loan)).Summary.RemainingPrincipal.Should().Be(900m);
        await api.AssertResult(0m, 0m);
        var disbursement = (await api.Transactions()).Should().ContainSingle().Subject;
        disbursement.AccountId.Should().Be(bank);
        disbursement.Direction.Should().Be("Income");
        disbursement.Amount.Should().Be(900m);
        var payment = await api.Pay(loan, bank, 100m);
        payment.Allocations.Sum(a => a.ToPrincipal).Should().Be(100m);
        payment.Allocations.Sum(a => a.ToInterest + a.ToLateInterest).Should().Be(0m);
        payment.RemainingPrincipal.Should().Be(800m);
        await api.AssertCash(bank, 6800m);
        await api.AssertResult(0m, 0m);
        (await api.Detail(loan)).Payments.Should().ContainSingle();
    }

    [Fact]
    public async Task Lent800AndRecovered320_RecognizeOnly20InterestIncomeAnd500Receivable()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var loan = await api.Loan(bank, 800m, type: "Lent", template: "SimpleOnBalance", rate: 0.025m);

        await api.AssertCash(bank, 5200m);
        await api.AssertResult(0m, 0m);
        (await api.Detail(loan)).Summary.RemainingPrincipal.Should().Be(800m);
        var payment = await api.Pay(loan, bank, 320m);

        payment.Allocations.Sum(a => a.ToPrincipal).Should().Be(300m);
        payment.Allocations.Sum(a => a.ToInterest).Should().Be(20m);
        payment.Allocations.Sum(a => a.ToLateInterest).Should().Be(0m);
        payment.RemainingPrincipal.Should().Be(500m);
        await api.AssertCash(bank, 5520m);
        await api.AssertResult(20m, 0m);
        (await api.Detail(loan)).Payments.Should().ContainSingle();
    }

    [Fact]
    public async Task InvalidInterestCategory_RollsBackPrincipalCashAndPaymentAllocation()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var loan = await api.Loan(null, 3000m, originationKind: "OpeningBalance",
            template: "SimpleOnBalance", rate: 0.01m, installments: 6);
        var before = await api.State();
        await api.Send(HttpMethod.Post, $"/v1/loans/{loan}/payments", api.PaymentBody(bank, 530m, Guid.NewGuid()), HttpStatusCode.BadRequest);
        (await api.State()).Should().BeEquivalentTo(before);
        await api.AssertCash(bank, 6000m);
        await api.AssertResult(0m, 0m);
    }

    [Fact]
    public async Task PaymentReplayAfterLaterPayment_ReturnsOriginalResultWithoutChangingCurrentState()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var loan = await api.Loan(null, 900m, originationKind: "OpeningBalance");
        var key = Guid.NewGuid();
        var original = await api.Pay(loan, bank, 100m, key: key);
        await api.Pay(loan, bank, 50m, key: Guid.NewGuid());
        var before = await api.State();
        (await api.Pay(loan, bank, 100m, key: key)).Should().BeEquivalentTo(original);
        (await api.State()).Should().BeEquivalentTo(before);
    }

    [Theory]
    [InlineData("Borrowed", 6100, 6060, "Income", "Expense")]
    [InlineData("Lent", 5900, 5940, "Expense", "Income")]
    public async Task OmittedNewOptions_PreserveExistingCashLoanAndPaymentSchedule(
        string type, decimal afterCreation, decimal afterPayment, string disbursementDirection, string paymentDirection)
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        // Deliberately omit all additive fields, including idempotency headers.
        var created = await api.Send(HttpMethod.Post, "/v1/loans", new CreateLoanRequest(
            "Synthetic legacy counterparty", type, "NoInterest", 100m, "BOB", 0m,
            TotalInstallments: 1, DisbursementDate: new DateOnly(2027, 1, 1), DisbursementAccountId: bank),
            HttpStatusCode.Created);
        var loan = created.GetProperty("id").GetGuid();
        await api.AssertCash(bank, afterCreation);
        var detail = await api.Detail(loan);
        detail.Summary.EarlyPaymentPolicy.Should().Be("AdvanceInstallments");
        detail.Installments.Should().ContainSingle(i => i.ExpectedPrincipal == 100m
            && i.ExpectedInterest == 0m && i.DueDate == new DateOnly(2027, 2, 1));
        (await api.Transactions()).Should().ContainSingle(t => t.Amount == 100m && t.Direction == disbursementDirection);

        await api.Send(HttpMethod.Post, $"/v1/loans/{loan}/payments",
            new RegisterLoanPaymentRequest(40m, AccountingHttpScenario.PaymentDate, bank), HttpStatusCode.OK);

        await api.AssertCash(bank, afterPayment);
        detail = await api.Detail(loan);
        detail.Summary.RemainingPrincipal.Should().Be(60m);
        detail.Payments.Should().ContainSingle(p => p.Amount == 40m
            && p.Allocations.Sum(a => a.ToPrincipal) == 40m);
        (await api.Transactions()).Should().HaveCount(2).And.Contain(t => t.Amount == 40m && t.Direction == paymentDirection);
    }

    [Fact]
    public async Task LoanCreationReplay_ReturnsSameLoanWithoutSecondCashPosting_AndRejectsChangedPayload()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var key = Guid.NewGuid();
        var loan = await api.Loan(bank, 900m, key: key);
        var before = await api.State();

        var replay = await api.Loan(bank, 900m, key: key);

        replay.Should().Be(loan);
        (await api.State()).Should().BeEquivalentTo(before);
        await api.Send(HttpMethod.Post, "/v1/loans", api.LoanBody(bank, 901m), HttpStatusCode.Conflict, key);
        (await api.State()).Should().BeEquivalentTo(before);
        await api.AssertCash(bank, 6900m);
    }

    [Fact]
    public async Task PaymentReplay_ReturnsSamePaymentWithoutSecondAllocation_AndRejectsChangedPayload()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var loan = await api.Loan(null, 900m, originationKind: "OpeningBalance");
        var key = Guid.NewGuid();
        var payment = await api.Pay(loan, bank, 100m, key: key);
        var before = await api.State();

        var replay = await api.Pay(loan, bank, 100m, key: key);

        replay.Should().BeEquivalentTo(payment);
        (await api.State()).Should().BeEquivalentTo(before);
        await api.Send(HttpMethod.Post, $"/v1/loans/{loan}/payments",
            api.PaymentBody(bank, 101m), HttpStatusCode.Conflict, key);
        (await api.State()).Should().BeEquivalentTo(before);
        await api.AssertCash(bank, 5900m);
    }

    [Theory]
    [InlineData("overpayment", HttpStatusCode.BadRequest)]
    [InlineData("currency", HttpStatusCode.BadRequest)]
    [InlineData("foreignAccount", HttpStatusCode.NotFound)]
    [InlineData("foreignLoan", HttpStatusCode.NotFound)]
    public async Task RejectedPayment_PreservesPublicAccountsLoansPaymentsAndTransactions(string failure, HttpStatusCode expected)
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var loan = await api.Loan(null, 900m, originationKind: "OpeningBalance");
        var other = Guid.NewGuid();
        var paymentAccount = failure switch
        {
            "currency" => await api.Account(50m, currency: "USD"),
            "foreignAccount" => await api.Account(50m, owner: other),
            _ => bank
        };
        var actor = failure == "foreignLoan" ? other : api.UserId;
        var before = await api.State();
        var beforeOther = await api.State(other);

        await api.Send(HttpMethod.Post, $"/v1/loans/{loan}/payments",
            api.PaymentBody(paymentAccount, failure == "overpayment" ? 901m : 100m), expected, owner: actor);

        (await api.State()).Should().BeEquivalentTo(before);
        (await api.State(other)).Should().BeEquivalentTo(beforeOther);
        await api.AssertCash(bank, 6000m);
    }

    [Fact]
    public async Task LoanPayment_FromRestrictedAccountTypeExceedingBalance_IsRejectedWithoutPostingAnything()
    {
        using var api = new AccountingHttpScenario();
        var cash = await api.Account(0m, type: AccountType.Cash);
        var loan = await api.Loan(null, 900m, originationKind: "OpeningBalance");
        var before = await api.State();

        await api.Send(HttpMethod.Post, $"/v1/loans/{loan}/payments",
            api.PaymentBody(cash, 50m), HttpStatusCode.BadRequest);

        (await api.State()).Should().BeEquivalentTo(before,
            "a Cash account cannot go negative; the rejected payment must leave the loan and cash untouched.");
        await api.AssertCash(cash, 0m);
    }

    [Fact]
    public async Task LoanPayment_FromCheckingAccountExceedingBalance_StillAllowsOverdraft()
    {
        using var api = new AccountingHttpScenario();
        var checking = await api.Account(0m, type: AccountType.Checking);
        var loan = await api.Loan(null, 900m, originationKind: "OpeningBalance");

        await api.Pay(loan, checking, 50m);

        await api.AssertCash(checking, -50m);
    }
}

// Shared HTTP-only fixture for the two accounting regression files. All financial
// setup uses authenticated endpoints; the existing factory supplies isolated SQLite.
internal sealed class AccountingHttpScenario : IDisposable
{
    private readonly CustomWebApplicationFactory factory = new(configureServices: services =>
        services.Replace(ServiceDescriptor.Singleton<IClock>(new JanuaryClock())));
    private readonly HttpClient client;
    public Guid UserId { get; } = Guid.NewGuid();
    public static DateTime PaymentDate => new(2027, 1, 15, 0, 0, 0, DateTimeKind.Utc);

    public AccountingHttpScenario() => client = factory.CreateClient();

    public async Task<JsonElement> Send(HttpMethod method, string path, object? body = null,
        HttpStatusCode expected = HttpStatusCode.OK, Guid? key = null, Guid? owner = null)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("X-User-Id", (owner ?? UserId).ToString());
        if (key.HasValue) request.Headers.Add("Idempotency-Key", key.Value.ToString());
        if (body is not null) request.Content = JsonContent.Create(body);
        using var response = await client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(expected, "{0} {1}: {2}", method, path, text);
        using var json = JsonDocument.Parse(text);
        if ((int)expected >= 400)
        {
            json.RootElement.GetProperty("status").GetInt32().Should().Be((int)expected);
            json.RootElement.GetProperty("title").GetString().Should().NotBeNullOrWhiteSpace();
        }
        return json.RootElement.Clone();
    }

    private async Task<T> Get<T>(string path, Guid? owner = null) =>
        (await Send(HttpMethod.Get, path, owner: owner)).Deserialize<T>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!;

    public async Task<Guid> Account(decimal balance, string currency = "BOB", Guid? owner = null, AccountType type = AccountType.Bank) =>
        (await Send(HttpMethod.Post, "/v1/accounts", new CreateAccountRequest("Synthetic accounting bank", type,
            currency, balance), HttpStatusCode.Created, owner: owner)).GetProperty("id").GetGuid();

    public object LoanBody(Guid? bank, decimal principal, string type = "Borrowed", string originationKind = "CashDisbursement",
        string loanKind = "Loan", string template = "NoInterest", decimal rate = 0m, int installments = 1) => new
    {
        counterpartyName = "Synthetic accounting counterparty", type, template, principal, currency = "BOB",
        interestRate = rate, rateUnit = "Monthly", totalInstallments = installments,
        disbursementDate = "2027-01-01", disbursementAccountId = bank, originationKind, loanKind
    };

    public async Task<Guid> Loan(Guid? bank, decimal principal, string type = "Borrowed", string originationKind = "CashDisbursement",
        string loanKind = "Loan", string template = "NoInterest", decimal rate = 0m, int installments = 1, Guid? key = null) =>
        (await Send(HttpMethod.Post, "/v1/loans", LoanBody(bank, principal, type, originationKind, loanKind, template, rate, installments),
            HttpStatusCode.Created, key)).GetProperty("id").GetGuid();

    public object PaymentBody(Guid bank, decimal amount, Guid? category = null) => new
    { amount, accountId = bank, paymentDate = PaymentDate, interestCategoryId = category };

    public async Task<LoanPaymentResultDto> Pay(Guid loan, Guid bank, decimal amount, Guid? category = null, Guid? key = null) =>
        (await Send(HttpMethod.Post, $"/v1/loans/{loan}/payments", PaymentBody(bank, amount, category), HttpStatusCode.OK, key))
            .Deserialize<LoanPaymentResultDto>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!;

    public async Task<Guid> Category(string name) =>
        (await Send(HttpMethod.Post, "/v1/categories", new { name, direction = 2 }, HttpStatusCode.Created)).GetProperty("id").GetGuid();

    public async Task Budget(Guid category, decimal limit) =>
        await Send(HttpMethod.Post, "/v1/planning/budgets", new CreateBudgetRequest(limit, "BOB", category), HttpStatusCode.Created);

    public Task<BudgetDto[]> Budgets() => Get<BudgetDto[]>("/v1/planning/budgets");
    public Task<LoanDetailDto> Detail(Guid id, Guid? owner = null) => Get<LoanDetailDto>($"/v1/loans/{id}", owner);
    public Task<LoanSummaryDto[]> Loans(Guid? owner = null) => Get<LoanSummaryDto[]>("/v1/loans", owner);
    public Task<AccountDto[]> Accounts(Guid? owner = null) => Get<AccountDto[]>("/v1/accounts", owner);
    public Task<TransactionDto[]> Transactions(Guid? owner = null) => Get<TransactionDto[]>("/v1/transactions?limit=100", owner);

    public async Task AssertCash(Guid bank, decimal expected) =>
        (await Accounts()).Single(a => a.Id == bank).Balance.Should().Be(expected);

    public async Task AssertResult(decimal income, decimal expense, Guid? category = null)
    {
        var suffix = category.HasValue ? $"&categoryId={category}" : "";
        var page = await Get<MovementPage>("/v1/transactions/movements?startUtc=2027-01-01T00:00:00Z&endUtcExclusive=2027-02-01T00:00:00Z&pageSize=100" + suffix);
        page.Summary.Sum(s => s.Income).Should().Be(income);
        page.Summary.Sum(s => s.Expenses).Should().Be(expense);
    }

    public async Task<PublicAccountingState> State(Guid? owner = null)
    {
        var accounts = await Accounts(owner);
        var loans = await Loans(owner);
        var details = new List<LoanDetailDto>();
        foreach (var loan in loans.OrderBy(l => l.Id)) details.Add(await Detail(loan.Id, owner));
        return new PublicAccountingState(accounts.OrderBy(a => a.Id).ToArray(), loans.OrderBy(l => l.Id).ToArray(),
            (await Transactions(owner)).OrderBy(t => t.Id).ToArray(), details.ToArray());
    }

    public void Dispose()
    {
        client.Dispose();
        factory.Dispose();
    }

    private sealed class JanuaryClock : IClock
    {
        public DateTime UtcNow => new(2027, 1, 31, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly TodayUtc => new(2027, 1, 31);
    }
}

internal sealed record PublicAccountingState(AccountDto[] Accounts, LoanSummaryDto[] Loans,
    TransactionDto[] Transactions, LoanDetailDto[] Details);
