using System.Net;
using FluentAssertions;

namespace Api.Tests;

public sealed class CardAccountingTests
{
    [Fact]
    public async Task CardOpening600ThenPurchase350_RecognizesExpenseAndDebt950WithoutCashOrOffsettingIncome()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var food = await api.Category("Synthetic food");
        await api.Budget(food, 950m);
        var card = await api.Loan(null, 600m, originationKind: "OpeningBalance", loanKind: "CreditCard");
        await api.AssertCash(bank, 6000m);
        await api.AssertResult(0m, 0m);
        (await api.Transactions()).Should().BeEmpty();
        (await api.Detail(card)).Summary.RemainingPrincipal.Should().Be(600m);

        var purchase = await api.Send(HttpMethod.Post, $"/v1/loans/{card}/purchases",
            Purchase(350m, food), HttpStatusCode.Created, Guid.NewGuid());

        purchase.GetProperty("id").GetGuid().Should().NotBeEmpty();
        await api.AssertCash(bank, 6000m);
        (await api.Accounts()).Should().ContainSingle();
        var detail = await api.Detail(card);
        detail.Summary.RemainingPrincipal.Should().Be(950m);
        detail.Payments.Should().BeEmpty();
        await api.AssertResult(0m, 350m);
        await api.AssertResult(0m, 350m, food);
        (await api.Budgets()).Should().ContainSingle(b => b.CategoryId == food
            && b.SpentAmount == 350m && b.RemainingAmount == 600m);
        var expense = (await api.Transactions()).Should().ContainSingle().Subject;
        expense.Amount.Should().Be(350m);
        expense.Currency.Should().Be("BOB");
        expense.Direction.Should().Be("Expense");
        expense.CategoryId.Should().Be(food);
        expense.OccurredAt.Should().Be(new DateTime(2027, 1, 7, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task CardPayment700_ReducesCashAndDebtTo250WithoutDuplicatingPurchaseExpenseOrBudget()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var food = await api.Category("Synthetic food");
        await api.Budget(food, 950m);
        var card = await api.Loan(null, 600m, originationKind: "OpeningBalance", loanKind: "CreditCard");
        await api.Send(HttpMethod.Post, $"/v1/loans/{card}/purchases", Purchase(350m, food),
            HttpStatusCode.Created, Guid.NewGuid());
        var postedPurchase = (await api.Transactions()).Single();

        var payment = await api.Pay(card, bank, 700m, key: Guid.NewGuid());

        payment.AmountPaid.Should().Be(700m);
        payment.RemainingPrincipal.Should().Be(250m);
        payment.Allocations.Sum(a => a.ToPrincipal).Should().Be(700m);
        payment.Allocations.Sum(a => a.ToInterest + a.ToLateInterest).Should().Be(0m);
        await api.AssertCash(bank, 5300m);
        var detail = await api.Detail(card);
        detail.Summary.RemainingPrincipal.Should().Be(250m);
        detail.Payments.Should().ContainSingle(p => p.Id == payment.PaymentId && p.Amount == 700m);
        await api.AssertResult(0m, 350m);
        await api.AssertResult(0m, 350m, food);
        (await api.Budgets()).Should().ContainSingle(b => b.SpentAmount == 350m && b.RemainingAmount == 600m);
        var transactions = await api.Transactions();
        transactions.Single(t => t.Id == postedPurchase.Id).Should().BeEquivalentTo(postedPurchase,
            "a payment must not mutate the immutable purchase");
        transactions.Should().HaveCount(2);
        transactions.Should().ContainSingle(t => t.AccountId == bank && t.Amount == 700m && t.Direction == "Expense");
    }

    [Fact]
    public async Task CardPurchaseReplay_ReturnsSamePurchaseWithoutSecondDebtOrExpense_AndRejectsChangedPayload()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var food = await api.Category("Synthetic food");
        var card = await api.Loan(null, 600m, originationKind: "OpeningBalance", loanKind: "CreditCard");
        var key = Guid.NewGuid();
        var created = await api.Send(HttpMethod.Post, $"/v1/loans/{card}/purchases", Purchase(350m, food),
            HttpStatusCode.Created, key);
        var before = await api.State();

        var replay = await api.Send(HttpMethod.Post, $"/v1/loans/{card}/purchases", Purchase(350m, food),
            HttpStatusCode.Created, key);

        replay.GetProperty("id").GetGuid().Should().Be(created.GetProperty("id").GetGuid());
        (await api.State()).Should().BeEquivalentTo(before);
        await api.Send(HttpMethod.Post, $"/v1/loans/{card}/purchases", Purchase(351m, food), HttpStatusCode.Conflict, key);
        (await api.State()).Should().BeEquivalentTo(before);
        await api.AssertCash(bank, 6000m);
        await api.AssertResult(0m, 350m);
    }

    [Fact]
    public async Task InvalidPurchaseDate_RollsBackTheAlreadyAttemptedExpenseAndDebt()
    {
        using var api = new AccountingHttpScenario();
        await api.Account(6000m);
        var food = await api.Category("Synthetic food");
        var card = await api.Loan(null, 600m, originationKind: "OpeningBalance", loanKind: "CreditCard");
        var before = await api.State();
        await api.Send(HttpMethod.Post, $"/v1/loans/{card}/purchases", Purchase(350m, food, occurredAt: "2026-12-31T00:00:00Z"),
            HttpStatusCode.BadRequest, Guid.NewGuid());
        (await api.State()).Should().BeEquivalentTo(before);
        await api.AssertResult(0m, 0m);
    }

    [Fact]
    public async Task LaterCardPurchase_DoesNotRewriteEarlierPaymentSnapshot_AndCannotBeReversedIndependently()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var food = await api.Category("Synthetic food");
        var card = await api.Loan(null, 600m, originationKind: "OpeningBalance", loanKind: "CreditCard");
        await api.Pay(card, bank, 100m);
        var originalPayment = (await api.Detail(card)).Payments.Single();
        await api.Send(HttpMethod.Post, $"/v1/loans/{card}/purchases", Purchase(350m, food, occurredAt: "2027-01-16T00:00:00Z"),
            HttpStatusCode.Created, Guid.NewGuid());
        (await api.Detail(card)).Payments.Single().Should().BeEquivalentTo(originalPayment);
        var expense = (await api.Transactions()).Single(t => t.Amount == 350m);
        var before = await api.State();
        await api.Send(HttpMethod.Post, $"/v1/transactions/{expense.Id}/reverse", new { reason = "Synthetic rejection" }, HttpStatusCode.Conflict);
        (await api.State()).Should().BeEquivalentTo(before);
    }

    [Theory]
    [InlineData("zero", HttpStatusCode.BadRequest)]
    [InlineData("negative", HttpStatusCode.BadRequest)]
    [InlineData("currency", HttpStatusCode.BadRequest)]
    [InlineData("foreignCategory", HttpStatusCode.BadRequest)]
    [InlineData("foreignLoan", HttpStatusCode.NotFound)]
    [InlineData("notCard", HttpStatusCode.BadRequest)]
    public async Task RejectedCardPurchase_IsAtomicAndPreservesPublicFinancialState(string failure, HttpStatusCode expected)
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var food = await api.Category("Synthetic food");
        var other = Guid.NewGuid();
        var category = food;
        if (failure == "foreignCategory")
        {
            var foreign = await api.Send(HttpMethod.Post, "/v1/categories", new { name = "Synthetic other category", direction = 2 },
                HttpStatusCode.Created, owner: other);
            category = foreign.GetProperty("id").GetGuid();
        }
        var card = await api.Loan(null, 600m, originationKind: "OpeningBalance",
            loanKind: failure == "notCard" ? "Loan" : "CreditCard");
        var before = await api.State();
        var beforeOther = await api.State(other);
        var amount = failure == "zero" ? 0m : failure == "negative" ? -350m : 350m;

        await api.Send(HttpMethod.Post, $"/v1/loans/{card}/purchases",
            Purchase(amount, category, failure == "currency" ? "USD" : "BOB"), expected, Guid.NewGuid(),
            failure == "foreignLoan" ? other : api.UserId);

        (await api.State()).Should().BeEquivalentTo(before);
        (await api.State(other)).Should().BeEquivalentTo(beforeOther);
        await api.AssertCash(bank, 6000m);
        await api.AssertResult(0m, 0m);
    }

    [Fact]
    public async Task OrdinaryExpenseAndIncome_KeepCashCategoryAndBudgetBehaviorWhenLoanMarkersAreAbsent()
    {
        using var api = new AccountingHttpScenario();
        var bank = await api.Account(6000m);
        var food = await api.Category("Synthetic cash food");
        await api.Budget(food, 950m);
        await api.Send(HttpMethod.Post, "/v1/transactions", new
        {
            accountId = bank, amount = 550m, direction = 2, categoryId = food,
            occurredAt = "2027-01-06T00:00:00Z", description = "Synthetic ordinary expense"
        }, HttpStatusCode.Created);
        await api.Send(HttpMethod.Post, "/v1/transactions", new
        {
            accountId = bank, amount = 5000m, direction = 1,
            occurredAt = "2027-01-02T00:00:00Z", description = "Synthetic salary"
        }, HttpStatusCode.Created);

        await api.AssertCash(bank, 10450m);
        await api.AssertResult(5000m, 550m);
        await api.AssertResult(0m, 550m, food);
        (await api.Budgets()).Should().ContainSingle(b => b.SpentAmount == 550m && b.RemainingAmount == 400m);
        (await api.Transactions()).Should().HaveCount(2);
        (await api.Loans()).Should().BeEmpty();
    }

    private static object Purchase(decimal amount, Guid categoryId, string currency = "BOB", string occurredAt = "2027-01-07T00:00:00Z") => new
    {
        amount, currency, categoryId, occurredAt, description = "Synthetic card food purchase"
    };
}
