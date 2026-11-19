using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Ledger.Application.Accounts.Services;
using Ledger.Domain.Accounts;
using Ledger.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Planning.Infrastructure;
using Xunit;

namespace Api.Tests;

// Public HTTP regression tests. New contract fields are read as JSON so the pre-change API still compiles.
public sealed class InvestmentPurchaseAccountingTests
{
    private static readonly DateTime PurchaseDate = new(2027, 1, 13, 12, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime ValuationDate = new(2027, 1, 21, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task JanuaryFixture_PurchaseExchangesAssets_ThenDatedValuationChangesOnlyValueAndGain()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        var opening = await Investment(client, investment);
        AssertPosition(opening, 20m, 2000m, 2000m);
        opening.GetProperty("initialValue").GetDecimal().Should().Be(2000m);
        var originalOperation = (await Json(client, HistoryPath(investment))).EnumerateArray().Single();
        originalOperation.GetProperty("quantity").GetDecimal().Should().Be(20m);
        originalOperation.GetProperty("unitPrice").GetDecimal().Should().Be(100m);
        originalOperation.GetProperty("totalAmount").GetDecimal().Should().Be(2000m);
        (await Json(client, "/v1/transactions")).GetArrayLength().Should().Be(0);

        using var bought = await Buy(client, investment, account, Guid.NewGuid());
        bought.StatusCode.Should().Be(HttpStatusCode.Created);
        var purchase = await Body(bought);
        var ledgerId = purchase.GetProperty("ledgerTransactionId").GetGuid();
        ledgerId.Should().NotBeEmpty();
        AssertOperation(purchase, "Buy", 5m, 120m, 600m, PurchaseDate);
        await AssertBalance(client, account, 5400m);
        var afterPurchase = await Investment(client, investment);
        AssertPosition(afterPurchase, 25m, 2600m, 2600m);
        afterPurchase.GetProperty("initialValue").GetDecimal().Should().Be(2000m);
        afterPurchase.GetProperty("unrealizedGain").GetDecimal().Should().Be(0m);
        // Buying five units at 120 does not reprice the original twenty units at 120.
        afterPurchase.GetProperty("currentValue").GetDecimal().Should().NotBe(3000m);
        var purchaseHistory = await Json(client, HistoryPath(investment));
        purchaseHistory.GetArrayLength().Should().Be(2);
        purchaseHistory.EnumerateArray().Single(x => Id(x) == Id(originalOperation)).GetRawText()
            .Should().Be(originalOperation.GetRawText(), "historical purchase quantity, price and cost are immutable");
        var cash = (await Json(client, "/v1/transactions")).EnumerateArray().Single();
        Id(cash).Should().Be(ledgerId);
        cash.GetProperty("amount").GetDecimal().Should().Be(600m);
        cash.GetProperty("investmentId").GetGuid().Should().Be(investment);
        cash.GetProperty("investmentCashKind").GetString().Should().Be("Contribution");
        cash.GetProperty("accountId").GetGuid().Should().Be(account);
        cash.GetProperty("occurredAt").GetDateTime().Should().Be(PurchaseDate);
        await AssertInvestmentMovement(client, investment, 1, 600m, 0m);
        (await Json(client, "/v1/transactions/movements?type=Expense")).GetProperty("totalCount").GetInt32().Should().Be(0);
        var cashBeforeValuation = await Read(client, "/v1/accounts");
        var ledgerBeforeValuation = await Read(client, "/v1/transactions");
        var movementsBeforeValuation = await Read(client, "/v1/transactions/movements?mode=Audit");

        using var revalued = await client.PostAsJsonAsync(OperationsPath(investment), new
        {
            type = "Revaluation", quantity = 0m, unitPrice = 110m, totalAmount = 2750m,
            occurredAt = ValuationDate, notes = "January closing reference price"
        });
        revalued.StatusCode.Should().Be(HttpStatusCode.Created);
        var valuation = await Body(revalued);
        AssertOperation(valuation, "Revaluation", 0m, 110m, 2750m, ValuationDate);
        valuation.GetProperty("ledgerTransactionId").ValueKind.Should().Be(JsonValueKind.Null);
        var closing = await Investment(client, investment);
        AssertPosition(closing, 25m, 2600m, 2750m);
        closing.GetProperty("unrealizedGain").GetDecimal().Should().Be(150m);
        closing.GetProperty("initialValue").GetDecimal().Should().Be(2000m);
        var datedPoint = closing.GetProperty("history").EnumerateArray()
            .Single(point => point.GetProperty("at").GetDateTime() == ValuationDate);
        datedPoint.GetProperty("value").GetDecimal().Should().Be(2750m);
        (await Read(client, "/v1/accounts")).Should().Be(cashBeforeValuation);
        (await Read(client, "/v1/transactions")).Should().Be(ledgerBeforeValuation);
        (await Read(client, "/v1/transactions/movements?mode=Audit")).Should().Be(movementsBeforeValuation);
        var closingHistory = await Json(client, HistoryPath(investment));
        closingHistory.GetArrayLength().Should().Be(3);
        foreach (var prior in purchaseHistory.EnumerateArray())
            closingHistory.EnumerateArray().Single(x => Id(x) == Id(prior)).GetRawText().Should().Be(prior.GetRawText());
    }

    [Theory]
    [InlineData(0, 120, 0, 0, "Investment.InvalidQuantity")]
    [InlineData(-1, 120, 600, 0, "Investment.InvalidQuantity")]
    [InlineData(5, 0, 600, 0, "Investment.InvalidUnitPrice")]
    [InlineData(5, -120, 600, 0, "Investment.InvalidUnitPrice")]
    [InlineData(5, 120, 0, 0, "Investment.InvalidAmount")]
    [InlineData(5, 120, -600, 0, "Investment.InvalidAmount")]
    [InlineData(5, 120, 599, 0, "Investment.InvalidAmount")]
    [InlineData(5, 120.0002, 600.001, 0, "Investment.InvalidAmount")]
    [InlineData(5, 120, 600, -1, "Investment.InvalidFees")]
    public async Task InvalidPurchase_RejectsWithoutChangingAnyPublicState(
        decimal quantity, decimal unitPrice, decimal totalAmount, decimal fees, string code)
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        var before = await Snapshot(client, investment);
        using var rejected = await Buy(client, investment, account, Guid.NewGuid(), quantity, unitPrice, totalAmount, fees);
        await Problem(rejected, HttpStatusCode.BadRequest, code);
        (await Snapshot(client, investment)).Should().Equal(before);
    }

    [Theory]
    [InlineData("missing", HttpStatusCode.NotFound, "Account.NotFound")]
    [InlineData("foreign", HttpStatusCode.NotFound, "Account.NotFound")]
    [InlineData("currency", HttpStatusCode.BadRequest, "Investment.CurrencyMismatch")]
    public async Task InvalidFundingAccount_LeavesBothOwnersAndAllPositionCountersUnchanged(
        string scenario, HttpStatusCode status, string code)
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        using var foreign = Client(factory);
        await Account(client);
        var foreignAccount = await Account(foreign);
        var investment = await Position(client);
        var foreignInvestment = await Position(foreign);
        var selected = scenario switch
        {
            "foreign" => foreignAccount,
            "currency" => await Account(client, currency: "USD"),
            _ => Guid.NewGuid()
        };
        var before = await Snapshot(client, investment);
        var foreignBefore = await Snapshot(foreign, foreignInvestment);
        using var rejected = await Buy(client, investment, selected, Guid.NewGuid());
        await Problem(rejected, status, code);
        (await Snapshot(client, investment)).Should().Equal(before);
        (await Snapshot(foreign, foreignInvestment)).Should().Equal(foreignBefore);
    }

    [Fact]
    public async Task ForeignPosition_CannotBePurchasedOrValued_AndNeitherOwnersStateChanges()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        using var foreign = Client(factory);
        var account = await Account(client);
        var own = await Position(client);
        var other = await Position(foreign);
        var before = await Snapshot(client, own);
        var foreignBefore = await Snapshot(foreign, other);
        using var buy = await Buy(client, other, account, Guid.NewGuid());
        await Problem(buy, HttpStatusCode.NotFound, "Investment.NotFound");
        using var value = await client.PostAsJsonAsync(OperationsPath(other), new
        {
            type = "Revaluation", quantity = 0m, unitPrice = 110m, totalAmount = 2200m, occurredAt = ValuationDate
        });
        await Problem(value, HttpStatusCode.NotFound, "Investment.NotFound");
        (await Snapshot(client, own)).Should().Equal(before);
        (await Snapshot(foreign, other)).Should().Equal(foreignBefore);
    }

    [Fact]
    public async Task Purchase_RequiresIdempotencyKey_WithoutConsumingCashOrOperationNumbers()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        var before = await Snapshot(client, investment);
        using var rejected = await Buy(client, investment, account, null);
        await Problem(rejected, HttpStatusCode.BadRequest, "Investment.IdempotencyKeyRequired");
        (await Snapshot(client, investment)).Should().Equal(before);
    }

    [Fact]
    public async Task PurchaseRetry_IsPayloadBound_AndExactReplayDoesNotWriteAnything()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client);
        var replacementAccount = await Account(client);
        var investment = await Position(client);
        var other = await Position(client);
        var key = Guid.NewGuid();
        using var first = await Buy(client, investment, account, key);
        first.StatusCode.Should().Be(HttpStatusCode.Created);
        var originalBody = await first.Content.ReadAsStringAsync();
        var before = await Snapshot(client, investment, other);
        using var replay = await Buy(client, investment, account, key);
        replay.StatusCode.Should().Be(HttpStatusCode.OK);
        (await replay.Content.ReadAsStringAsync()).Should().Be(originalBody);
        (await Snapshot(client, investment, other)).Should().Equal(before);

        using var decimalScaleReplay = await Buy(client, investment, account, key, 5.00m, 120.000000m, 600.00m, 0.00m);
        decimalScaleReplay.StatusCode.Should().Be(HttpStatusCode.OK);
        (await decimalScaleReplay.Content.ReadAsStringAsync()).Should().Be(originalBody);
        (await Snapshot(client, investment, other)).Should().Equal(before);

        // Every economic/reference input is part of the retry identity, not only the key or total.
        var changedPayloads = new[]
        {
            PurchasePayload(account, quantity: 6m, totalAmount: 720m),
            PurchasePayload(account, unitPrice: 121m, totalAmount: 605m),
            PurchasePayload(account, fees: 1m),
            PurchasePayload(replacementAccount),
            PurchasePayload(account, occurredAt: PurchaseDate.AddDays(1)),
            PurchasePayload(account, notes: "Different purchase reference"),
            new { type = "Sell", quantity = 5m, unitPrice = 120m, totalAmount = 600m, fees = 0m, occurredAt = PurchaseDate, linkedAccountId = account, notes = "January fixture purchase" },
            new { type = "Buy", quantity = 5m, unitPrice = 120m, totalAmount = 600m, fees = 0m, occurredAt = PurchaseDate, notes = "January fixture purchase" }
        };
        foreach (var payload in changedPayloads)
        {
            using var conflict = await SendOperation(client, investment, payload, key);
            await Problem(conflict, HttpStatusCode.Conflict, "Investment.IdempotencyConflict");
            (await Snapshot(client, investment, other)).Should().Equal(before);
        }
        using var crossPosition = await Buy(client, other, account, key);
        await Problem(crossPosition, HttpStatusCode.Conflict, "Investment.IdempotencyConflict");
        (await Snapshot(client, investment, other)).Should().Equal(before);
        await AssertBalance(client, account, 5400m);
        await AssertBalance(client, replacementAccount, 6000m);
        AssertPosition(await Investment(client, investment), 25m, 2600m, 2600m);
        (await Json(client, HistoryPath(investment))).GetArrayLength().Should().Be(2);
        (await Json(client, "/v1/transactions")).GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task SimultaneousDoubleSubmit_CommitsOnePurchase_ThenReplaysStableOperation()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        var key = Guid.NewGuid();
        var responses = await Task.WhenAll(Buy(client, investment, account, key), Buy(client, investment, account, key));
        try
        {
            responses.Count(response => response.StatusCode == HttpStatusCode.Created).Should().Be(1);
            var duplicate = responses.Single(response => response.StatusCode != HttpStatusCode.Created);
            duplicate.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Conflict);
            var committedBody = await responses.Single(response => response.StatusCode == HttpStatusCode.Created).Content.ReadAsStringAsync();
            if (duplicate.StatusCode == HttpStatusCode.OK)
                (await duplicate.Content.ReadAsStringAsync()).Should().Be(committedBody);
            else
                (await Body(duplicate)).GetProperty("title").GetString().Should().Be("Investment.ConcurrentChange");
            await AssertBalance(client, account, 5400m);
            AssertPosition(await Investment(client, investment), 25m, 2600m, 2600m);
            (await Json(client, HistoryPath(investment))).GetArrayLength().Should().Be(2);
            (await Json(client, "/v1/transactions")).GetArrayLength().Should().Be(1);
            await AssertInvestmentMovement(client, investment, 1, 600m, 0m);
            var beforeReplay = await Snapshot(client, investment);
            using var retry = await Buy(client, investment, account, key);
            retry.StatusCode.Should().Be(HttpStatusCode.OK);
            (await retry.Content.ReadAsStringAsync()).Should().Be(committedBody);
            (await Snapshot(client, investment)).Should().Equal(beforeReplay);
        }
        finally
        {
            foreach (var response in responses) response.Dispose();
        }
    }

    [Fact]
    public async Task FailureAfterPlanningSave_RollsBackCashPositionAndOperation_AndKeyCanBeRetried()
    {
        var failure = new FailAfterPlanningSave();
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true, configureServices: services =>
        {
            services.AddDbContext<LedgerDbContext>(options => options.AddInterceptors(failure));
            services.AddDbContext<PlanningDbContext>(options => options.AddInterceptors(failure));
        });
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        var key = Guid.NewGuid();
        var before = await Snapshot(client, investment);
        failure.Armed = true;
        using var rejected = await Buy(client, investment, account, key);
        rejected.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        (await Snapshot(client, investment)).Should().Equal(before, "a failure after both saves must roll back every public projection");
        failure.LedgerSaveObservedBeforeFailure.Should().BeTrue("the injected failure must occur after the cash-leg write");
        using var retry = await Buy(client, investment, account, key);
        retry.StatusCode.Should().Be(HttpStatusCode.Created);
        await AssertBalance(client, account, 5400m);
        AssertPosition(await Investment(client, investment), 25m, 2600m, 2600m);
        (await Json(client, HistoryPath(investment))).GetArrayLength().Should().Be(2);
        (await Json(client, "/v1/transactions")).GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task CashOnlyReversalRoute_CannotReversePurchaseCashAndLeavePositionOrphaned()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        using var bought = await Buy(client, investment, account, Guid.NewGuid());
        bought.StatusCode.Should().Be(HttpStatusCode.Created);
        var ledgerId = (await Body(bought)).GetProperty("ledgerTransactionId").GetGuid();
        var before = await Snapshot(client, investment);
        using var rejected = await client.PostAsync($"/v1/planning/investment-cash/{ledgerId}/reverse", null);
        rejected.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await Snapshot(client, investment)).Should().Equal(before);
    }

    [Fact]
    public async Task Preserve_CashOnlyContributionDisposalAndReversal_NeverChangePositionOrCostHistory()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client, 100m);
        var investment = await Position(client);
        var positionBefore = await Read(client, "/v1/planning/investments");
        var operationsBefore = await Read(client, HistoryPath(investment));
        using var contributed = await client.PostAsJsonAsync($"/v1/planning/investments/{investment}/cash/Contribution", new
        {
            accountId = account, amount = 25m, occurredAt = PurchaseDate
        });
        contributed.StatusCode.Should().Be(HttpStatusCode.Created);
        var cashId = (await Body(contributed)).GetProperty("ledgerTransactionId").GetGuid();
        await AssertBalance(client, account, 75m);
        using var disposed = await client.PostAsJsonAsync($"/v1/planning/investments/{investment}/cash/Disposal", new
        {
            accountId = account, amount = 5m, occurredAt = PurchaseDate
        });
        disposed.StatusCode.Should().Be(HttpStatusCode.Created);
        await AssertBalance(client, account, 80m);
        await AssertInvestmentMovement(client, investment, 2, 25m, 5m);
        (await Read(client, "/v1/planning/investments")).Should().Be(positionBefore);
        (await Read(client, HistoryPath(investment))).Should().Be(operationsBefore);
        using var reversed = await client.PostAsync($"/v1/planning/investment-cash/{cashId}/reverse", null);
        reversed.StatusCode.Should().Be(HttpStatusCode.OK);
        await AssertBalance(client, account, 105m);
        (await Read(client, "/v1/planning/investments")).Should().Be(positionBefore);
        (await Read(client, HistoryPath(investment))).Should().Be(operationsBefore);
        var afterReversal = await Snapshot(client, investment);
        using var duplicate = await client.PostAsync($"/v1/planning/investment-cash/{cashId}/reverse", null);
        await Problem(duplicate, HttpStatusCode.Conflict, "InvestmentCash.AlreadyReversed");
        (await Snapshot(client, investment)).Should().Equal(afterReversal);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Preserve_LegacyValueUpdate_WithOmittedOrExplicitQuantity_IsCashNeutral(bool explicitQuantity)
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        await Account(client);
        var investment = await Position(client);
        var original = await Investment(client, investment);
        var accountsBefore = await Read(client, "/v1/accounts");
        var ledgerBefore = await Read(client, "/v1/transactions");
        var operationsBefore = await Read(client, HistoryPath(investment));
        object payload = explicitQuantity ? new { currentValue = 2500m, quantity = 25m } : new { currentValue = 2500m };
        using var updated = await client.PutAsJsonAsync($"/v1/planning/investments/{investment}/value", payload);
        updated.StatusCode.Should().Be(HttpStatusCode.OK);
        var current = await Body(updated);
        current.GetProperty("quantity").GetDecimal().Should().Be(explicitQuantity ? 25m : 20m);
        current.GetProperty("currentValue").GetDecimal().Should().Be(2500m);
        current.GetProperty("initialValue").GetDecimal().Should().Be(2000m);
        current.GetProperty("variationPct").GetDecimal().Should().Be(25m);
        current.GetProperty("history").GetArrayLength().Should().Be(2);
        current.GetProperty("history")[0].GetRawText().Should().Be(original.GetProperty("history")[0].GetRawText());
        current.GetProperty("createdAt").GetString().Should().Be(original.GetProperty("createdAt").GetString());
        (await Read(client, "/v1/accounts")).Should().Be(accountsBefore);
        (await Read(client, "/v1/transactions")).Should().Be(ledgerBefore);
        (await Read(client, HistoryPath(investment))).Should().Be(operationsBefore);
    }

    [Fact]
    public async Task PurchaseFees_AreSeparateImmutableInputs_CapitalizedInCostAndCashWithoutConsumerExpense()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        using var purchase = await Buy(client, investment, account, Guid.NewGuid(), 1m, 100m, 100m, 2m);
        purchase.StatusCode.Should().Be(HttpStatusCode.Created);
        var operation = await Body(purchase);
        operation.GetProperty("fees").GetDecimal().Should().Be(2m);
        operation.GetProperty("totalAmount").GetDecimal().Should().Be(100m);
        await AssertBalance(client, account, 5898m);
        AssertPosition(await Investment(client, investment), 21m, 2102m, 2102m);
        await AssertInvestmentMovement(client, investment, 1, 102m, 0m);
    }

    [Fact]
    public async Task LegacyQuantityCorrection_DoesNotInventAcquisitionCost_AndLaterPurchasePreservesUnknownCost()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        using var corrected = await client.PutAsJsonAsync($"/v1/planning/investments/{investment}/value", new { currentValue = 2500m, quantity = 25m });
        corrected.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Body(corrected)).GetProperty("costBasis").ValueKind.Should().Be(JsonValueKind.Null);
        using var purchase = await Buy(client, investment, account, Guid.NewGuid());
        purchase.StatusCode.Should().Be(HttpStatusCode.Created);
        var position = await Investment(client, investment);
        position.GetProperty("quantity").GetDecimal().Should().Be(30m);
        position.GetProperty("currentValue").GetDecimal().Should().Be(3100m);
        position.GetProperty("costBasis").ValueKind.Should().Be(JsonValueKind.Null);
        position.GetProperty("unrealizedGain").ValueKind.Should().Be(JsonValueKind.Null);
        await AssertBalance(client, account, 5400m);
        (await Json(client, HistoryPath(investment))).GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task FundedDividend_RecognizesIncomeOnce_WithoutChangingPosition_AndReplaysExactBody()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        var positionBefore = (await Investment(client, investment)).GetRawText();
        var key = Guid.NewGuid();
        using var paid = await Dividend(client, investment, account, key);
        paid.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await paid.Content.ReadAsStringAsync();
        var operation = JsonSerializer.Deserialize<JsonElement>(body);
        AssertOperation(operation, "Dividend", 0m, 0m, 40m, PurchaseDate);
        var ledgerId = operation.GetProperty("ledgerTransactionId").GetGuid();
        ledgerId.Should().NotBeEmpty();
        var cash = (await Json(client, "/v1/transactions")).EnumerateArray().Single();
        cash.GetProperty("investmentId").GetGuid().Should().Be(investment);
        cash.GetProperty("investmentCashKind").GetString().Should().Be("Dividend");
        await AssertBalance(client, account, 6040m);
        (await Investment(client, investment)).GetRawText().Should().Be(positionBefore);
        (await Json(client, HistoryPath(investment))).GetArrayLength().Should().Be(2);
        var movement = await Json(client, "/v1/transactions/movements?type=Income&startUtc=2027-01-01T00:00:00Z&endUtcExclusive=2027-02-01T00:00:00Z");
        movement.GetProperty("totalCount").GetInt32().Should().Be(1);
        var row = movement.GetProperty("items").EnumerateArray().Single();
        Id(row).Should().Be(ledgerId);
        row.GetProperty("kind").GetString().Should().Be("Income");
        row.GetProperty("investmentCashKind").GetString().Should().Be("Dividend");
        row.GetProperty("investmentId").GetGuid().Should().Be(investment);
        var summary = movement.GetProperty("summary").EnumerateArray().Single();
        summary.GetProperty("income").GetDecimal().Should().Be(40m);
        summary.GetProperty("expenses").GetDecimal().Should().Be(0m);
        summary.GetProperty("disposals").GetDecimal().Should().Be(0m);
        (await Json(client, "/v1/transactions/movements?type=Investment")).GetProperty("totalCount").GetInt32().Should().Be(0);
        var beforeReplay = await Snapshot(client, investment);
        using var replay = await Dividend(client, investment, account, key);
        replay.StatusCode.Should().Be(HttpStatusCode.OK);
        (await replay.Content.ReadAsStringAsync()).Should().Be(body);
        using var conflict = await Dividend(client, investment, account, key, 41m);
        await Problem(conflict, HttpStatusCode.Conflict, "Investment.IdempotencyConflict");
        (await Snapshot(client, investment)).Should().Equal(beforeReplay);
        using var independentReverse = await client.PostAsJsonAsync($"/v1/transactions/{ledgerId}/reverse", new { reason = "Attempt independent dividend cash reversal" });
        await Problem(independentReverse, HttpStatusCode.Conflict, "InvestmentCash.RequiresCoordinatedReverse");
        (await Snapshot(client, investment)).Should().Equal(beforeReplay);
    }

    [Theory]
    [InlineData(0, "Investment.InvalidAmount")]
    [InlineData(-1, "Investment.InvalidAmount")]
    [InlineData(40.001, "Investment.InvalidAmount")]
    public async Task InvalidFundedDividend_LeavesCashHistoryAndPositionUnchanged(decimal amount, string code)
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        var before = await Snapshot(client, investment);
        using var rejected = await Dividend(client, investment, account, Guid.NewGuid(), amount);
        await Problem(rejected, HttpStatusCode.BadRequest, code);
        (await Snapshot(client, investment)).Should().Equal(before);
    }

    [Fact]
    public async Task FundedDividend_FailureAfterPlanningSave_RollsBackIncomeAndHistory_ThenExplicitRetrySucceeds()
    {
        var failure = new FailAfterPlanningSave();
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true, configureServices: services =>
        {
            services.AddDbContext<LedgerDbContext>(options => options.AddInterceptors(failure));
            services.AddDbContext<PlanningDbContext>(options => options.AddInterceptors(failure));
        });
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        var key = Guid.NewGuid();
        var before = await Snapshot(client, investment);
        failure.Armed = true;
        using var rejected = await Dividend(client, investment, account, key);
        rejected.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        failure.LedgerSaveObservedBeforeFailure.Should().BeTrue();
        (await Snapshot(client, investment)).Should().Equal(before);
        using var retry = await Dividend(client, investment, account, key);
        retry.StatusCode.Should().Be(HttpStatusCode.Created);
        await AssertBalance(client, account, 6040m);
        (await Json(client, HistoryPath(investment))).GetArrayLength().Should().Be(2);
    }

    [Theory]
    [InlineData(1, 0, 0, "Investment.InvalidQuantity")]
    [InlineData(0, 1, 0, "Investment.InvalidUnitPrice")]
    [InlineData(0, 0, 1, "Investment.InvalidFees")]
    public async Task FundedDividend_RejectsPositionMutationOrFeeInputs(decimal quantity, decimal unitPrice, decimal fees, string code)
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var account = await Account(client);
        var investment = await Position(client);
        var before = await Snapshot(client, investment);
        using var rejected = await SendOperation(client, investment, new { type = "Dividend", quantity, unitPrice,
            totalAmount = 40m, fees, linkedAccountId = account, occurredAt = PurchaseDate }, Guid.NewGuid());
        await Problem(rejected, HttpStatusCode.BadRequest, code);
        (await Snapshot(client, investment)).Should().Equal(before);
    }

    [Fact]
    public async Task LegacySell_FullyLiquidatingThePosition_ArchivesTheInvestmentInsteadOfLeavingAStalePosition()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var investment = await Position(client);
        var before = await Investment(client, investment);
        AssertPosition(before, 20m, 2000m, 2000m);

        using var sold = await SendOperation(client, investment, new { type = "Sell", quantity = 20m, unitPrice = 100m,
            totalAmount = 2000m, fees = 0m, occurredAt = PurchaseDate, notes = "Full liquidation" }, null);
        sold.StatusCode.Should().Be(HttpStatusCode.Created);

        (await Json(client, "/v1/planning/investments")).EnumerateArray().Should().NotContain(x => Id(x) == investment,
            "a fully liquidated legacy position must be archived, not left visible with a stale quantity/value.");
        (await Json(client, HistoryPath(investment))).EnumerateArray().Should().ContainSingle(x =>
            x.GetProperty("type").GetString() == "Sell" && x.GetProperty("quantity").GetDecimal() == 20m,
            "the Sell transaction itself remains in the immutable history even though the position is archived.");
    }

    [Fact]
    public async Task LegacySell_ExceedingHeldQuantity_IsRejectedWithoutMutatingThePosition()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var investment = await Position(client);
        var before = await Investment(client, investment);

        using var rejected = await SendOperation(client, investment, new { type = "Sell", quantity = 25m, unitPrice = 100m,
            totalAmount = 2500m, fees = 0m, occurredAt = PurchaseDate }, null);
        await Problem(rejected, HttpStatusCode.BadRequest, "Investment.InsufficientQuantity");

        var after = await Investment(client, investment);
        after.GetRawText().Should().Be(before.GetRawText(), "a rejected oversell must leave the position byte-for-byte unchanged.");
        (await Json(client, HistoryPath(investment))).GetArrayLength().Should().Be(1, "no Sell transaction should be recorded for a rejected oversell.");
    }

    [Fact]
    public async Task LegacySell_PartialSale_ReducesQuantityAndValueProportionally()
    {
        using var factory = new CustomWebApplicationFactory(shareLedgerPlanning: true);
        using var client = Client(factory);
        var investment = await Position(client);

        using var sold = await SendOperation(client, investment, new { type = "Sell", quantity = 8m, unitPrice = 100m,
            totalAmount = 800m, fees = 0m, occurredAt = PurchaseDate }, null);
        sold.StatusCode.Should().Be(HttpStatusCode.Created);

        var after = await Investment(client, investment);
        after.GetProperty("quantity").GetDecimal().Should().Be(12m, "20 units minus the 8 sold.");
        after.GetProperty("currentValue").GetDecimal().Should().Be(1200m, "2000 minus the 8 units sold at 100 each.");
        after.GetProperty("costBasis").ValueKind.Should().Be(JsonValueKind.Null,
            "legacy sale math cannot establish remaining cost basis; it must honestly report unknown, not a fabricated number.");
    }

    private static Task<HttpResponseMessage> Dividend(HttpClient client, Guid investment, Guid account, Guid key, decimal amount = 40m) =>
        SendOperation(client, investment, new { type = "Dividend", quantity = 0m, unitPrice = 0m, totalAmount = amount,
            fees = 0m, linkedAccountId = account, occurredAt = PurchaseDate, notes = "January cash dividend" }, key);

    private static HttpClient Client(CustomWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-User-Id", Guid.NewGuid().ToString());
        return client;
    }

    private static async Task<Guid> Account(HttpClient client, decimal balance = 6000m, string currency = "BOB")
    {
        using var response = await client.PostAsJsonAsync("/v1/accounts", new CreateAccountRequest("Purchase cash", AccountType.Bank, currency, balance));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return Id(await Body(response));
    }

    private static async Task<Guid> Position(HttpClient client)
    {
        using var response = await client.PostAsJsonAsync("/v1/planning/investments", new
        {
            name = "January opening shares", kind = "stocks", iconKey = "trending-up", colorKey = "blue",
            currency = "BOB", quantity = 20m, currentValue = 2000m
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return Id(await Body(response));
    }

    private static object PurchasePayload(Guid account, decimal quantity = 5m, decimal unitPrice = 120m,
        decimal totalAmount = 600m, decimal fees = 0m, DateTime? occurredAt = null, string notes = "January fixture purchase") => new
    {
        type = "Buy", quantity, unitPrice, totalAmount, fees, occurredAt = occurredAt ?? PurchaseDate,
        linkedAccountId = account, notes
    };

    private static Task<HttpResponseMessage> Buy(HttpClient client, Guid investment, Guid account, Guid? key,
        decimal quantity = 5m, decimal unitPrice = 120m, decimal totalAmount = 600m, decimal fees = 0m) =>
        SendOperation(client, investment, PurchasePayload(account, quantity, unitPrice, totalAmount, fees), key);

    private static async Task<HttpResponseMessage> SendOperation(HttpClient client, Guid investment, object payload, Guid? key)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, OperationsPath(investment)) { Content = JsonContent.Create(payload) };
        if (key.HasValue) request.Headers.Add("Idempotency-Key", key.Value.ToString());
        return await client.SendAsync(request);
    }

    private static void AssertPosition(JsonElement position, decimal units, decimal cost, decimal value)
    {
        position.GetProperty("quantity").GetDecimal().Should().Be(units);
        position.GetProperty("costBasis").GetDecimal().Should().Be(cost);
        position.GetProperty("currentValue").GetDecimal().Should().Be(value);
    }

    private static void AssertOperation(JsonElement operation, string type, decimal units, decimal price, decimal total, DateTime date)
    {
        operation.GetProperty("type").GetString().Should().Be(type);
        operation.GetProperty("quantity").GetDecimal().Should().Be(units);
        operation.GetProperty("unitPrice").GetDecimal().Should().Be(price);
        operation.GetProperty("totalAmount").GetDecimal().Should().Be(total);
        operation.GetProperty("fees").GetDecimal().Should().Be(0m);
        operation.GetProperty("occurredAt").GetDateTime().Should().Be(date);
    }

    private static async Task AssertBalance(HttpClient client, Guid account, decimal expected)
    {
        var accounts = await Json(client, "/v1/accounts");
        accounts.EnumerateArray().Single(x => Id(x) == account).GetProperty("balance").GetDecimal().Should().Be(expected);
    }

    private static async Task AssertInvestmentMovement(HttpClient client, Guid investment, int count, decimal contributions, decimal disposals)
    {
        var page = await Json(client, "/v1/transactions/movements?type=Investment");
        page.GetProperty("totalCount").GetInt32().Should().Be(count);
        foreach (var item in page.GetProperty("items").EnumerateArray())
        {
            item.GetProperty("kind").GetString().Should().Be("Investment");
            item.GetProperty("investmentId").GetGuid().Should().Be(investment);
        }
        var summary = page.GetProperty("summary").EnumerateArray().Single();
        summary.GetProperty("income").GetDecimal().Should().Be(0m);
        summary.GetProperty("expenses").GetDecimal().Should().Be(0m);
        summary.GetProperty("contributions").GetDecimal().Should().Be(contributions);
        summary.GetProperty("disposals").GetDecimal().Should().Be(disposals);
    }

    private static async Task<string[]> Snapshot(HttpClient client, params Guid[] investments)
    {
        var values = new List<string>
        {
            await Read(client, "/v1/accounts"), await Read(client, "/v1/planning/investments"),
            await Read(client, "/v1/transactions?limit=100"),
            await Read(client, "/v1/transactions/movements?mode=Audit&pageSize=100"),
            await Read(client, "/v1/planning/budgets")
        };
        foreach (var investment in investments) values.Add(await Read(client, HistoryPath(investment)));
        return values.ToArray();
    }

    private static async Task<JsonElement> Investment(HttpClient client, Guid investment) =>
        (await Json(client, "/v1/planning/investments")).EnumerateArray().Single(x => Id(x) == investment);
    private static Guid Id(JsonElement value) => value.GetProperty("id").GetGuid();
    private static string OperationsPath(Guid investment) => $"/v1/planning/investments/{investment}/operations";
    private static string HistoryPath(Guid investment) => $"/v1/planning/investments/{investment}/transactions";
    private static async Task<JsonElement> Body(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();
    private static async Task<JsonElement> Json(HttpClient client, string path) => JsonSerializer.Deserialize<JsonElement>(await Read(client, path));
    private static async Task<string> Read(HttpClient client, string path)
    {
        using var response = await client.GetAsync(path);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return await response.Content.ReadAsStringAsync();
    }
    private static async Task Problem(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        response.StatusCode.Should().Be(status);
        (await Body(response)).GetProperty("title").GetString().Should().Be(code);
    }

    // Fault injection only; setup and every state assertion use HTTP, never database rows or raw SQL.
    private sealed class FailAfterPlanningSave : SaveChangesInterceptor
    {
        public bool Armed { get; set; }
        public bool LedgerSaveObservedBeforeFailure { get; private set; }
        public override ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData data, int result, CancellationToken ct = default)
        {
            if (!Armed) return ValueTask.FromResult(result);
            if (data.Context is LedgerDbContext) LedgerSaveObservedBeforeFailure = true;
            if (data.Context is PlanningDbContext)
            {
                Armed = false;
                throw new InvalidOperationException("Injected investment failure after Planning save.");
            }
            return ValueTask.FromResult(result);
        }
    }
}
