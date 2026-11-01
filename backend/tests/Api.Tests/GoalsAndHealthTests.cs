using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Api.Endpoints;
using BuildingBlocks.Currencies;
using Ledger.Domain.Accounts;
using BuildingBlocks.ValueObjects;
using Ledger.Domain.Transactions;
using Ledger.Application.Accounts.Services;
using Ledger.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Planning.Contracts;
using Planning.Domain.Goals;
using Xunit;
using FluentAssertions;

namespace Api.Tests;

public sealed class GoalsAndHealthTests
{
    [Fact]
    public void GoalProgress_UsesCurrencyPrecisionAndOnlyRecommendsForFutureIncompleteGoals()
    {
        var userId = Guid.NewGuid();
        var today = new DateOnly(2026, 5, 12);
        var sameDay = Goal.Create(userId, "Same day", Money.Of(1m, Currency.BTC), today, null);
        var sameDayProgress = sameDay.EvaluateProgress(0m, today);
        sameDayProgress.MonthlyContributionNeeded.Should().BeNull();
        sameDayProgress.MonthsRemaining.Should().BeNull();

        var future = Goal.Create(userId, "BTC savings", Money.Of(0.00000003m, Currency.BTC), today.AddMonths(1), null);
        var futureProgress = future.EvaluateProgress(0.00000001m, today);
        futureProgress.CurrentAmount.Should().Be(0.00000001m);
        futureProgress.RemainingAmount.Should().Be(0.00000002m);
        futureProgress.MonthlyContributionNeeded.Should().Be(0.00000002m);

        var completedProgress = future.EvaluateProgress(0.00000003m, today);
        completedProgress.RemainingAmount.Should().Be(0m);
        completedProgress.MonthlyContributionNeeded.Should().BeNull();
    }

    [Fact]
    public async Task FinancialHealth_PartitionsCurrenciesAndAggregatesAllTransactionsExcludingTransfers()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();

        async Task<Guid> CreateAccount(string name, string currency)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
            {
                Content = JsonContent.Create(new CreateAccountRequest(name, AccountType.Bank, currency, 0m))
            };
            request.Headers.Add("X-User-Id", userId.ToString());
            using var response = await client.SendAsync(request);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return body.RootElement.GetProperty("id").GetGuid();
        }

        var bob = await CreateAccount("BOB cash", "BOB");
        var bobTransferSource = await CreateAccount("BOB transfer source", "BOB");
        var bobTransferTarget = await CreateAccount("BOB transfer target", "BOB");
        var usd = await CreateAccount("USD cash", "USD");
        var now = DateTime.UtcNow;

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
            for (var i = 0; i < 101; i++)
            {
                db.Transactions.Add(Transaction.Create(userId, bob, Money.Of(1m, Currency.BOB),
                    TransactionDirection.Income, null, now, "synthetic health test", createdAt: now));
            }

            db.Transactions.Add(Transaction.Create(userId, usd, Money.Of(15m, Currency.USD),
                TransactionDirection.Expense, null, now, "synthetic health test", createdAt: now));
            var transfer = Transaction.CreateTransfer(userId, bobTransferSource,
                Money.Of(900m, Currency.BOB), bobTransferTarget, Money.Of(900m, Currency.BOB),
                now, null, null, "synthetic internal transfer", now);
            db.Transactions.AddRange(transfer.Outflow, transfer.Inflow);
            await db.SaveChangesAsync();
        }

        using var healthRequest = new HttpRequestMessage(HttpMethod.Get, "/v1/planning/financial-health");
        healthRequest.Headers.Add("X-User-Id", userId.ToString());
        using var healthResponse = await client.SendAsync(healthRequest);
        healthResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await healthResponse.Content.ReadAsStringAsync());
        var root = json.RootElement;
        var rows = root.GetProperty("currencies").EnumerateArray().ToDictionary(
            row => row.GetProperty("currency").GetString()!, row => row);

        rows["BOB"].GetProperty("monthlyIncome").GetDecimal().Should().Be(101m);
        rows["BOB"].GetProperty("monthlyExpenses").GetDecimal().Should().Be(0m);
        rows["BOB"].GetProperty("netCashFlow").GetDecimal().Should().Be(101m);
        rows["BOB"].GetProperty("savingsRatePercentage").GetDecimal().Should().Be(100m);
        rows["USD"].GetProperty("monthlyIncome").GetDecimal().Should().Be(0m);
        rows["USD"].GetProperty("monthlyExpenses").GetDecimal().Should().Be(15m);
        rows["USD"].GetProperty("netCashFlow").GetDecimal().Should().Be(-15m);
        rows["USD"].GetProperty("savingsRatePercentage").ValueKind.Should().Be(JsonValueKind.Null);
        root.GetProperty("monthStartUtc").GetDateTime().Kind.Should().Be(DateTimeKind.Utc);
        root.TryGetProperty("emergencyFundMonths", out _).Should().BeFalse();
        root.TryGetProperty("split503020", out _).Should().BeFalse();
    }

    [Fact]
    public async Task Goals_RejectCurrencyMismatchAndExposeUnlinkedProgressAsUnavailable()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();

        async Task<Guid> CreateAccount(string currency)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
            {
                Content = JsonContent.Create(new CreateAccountRequest("Goal account", AccountType.Bank, currency, 25m))
            };
            request.Headers.Add("X-User-Id", userId.ToString());
            using var response = await client.SendAsync(request);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return body.RootElement.GetProperty("id").GetGuid();
        }

        var bobAccount = await CreateAccount("BOB");
        using (var mismatch = new HttpRequestMessage(HttpMethod.Post, "/v1/planning/goals")
        {
            Content = JsonContent.Create(new CreateGoalRequest("USD goal", 100m, "USD", AccountId: bobAccount))
        })
        {
            mismatch.Headers.Add("X-User-Id", userId.ToString());
            using var response = await client.SendAsync(mismatch);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        async Task CreateGoal(CreateGoalRequest goalRequest)
        {
            using var create = new HttpRequestMessage(HttpMethod.Post, "/v1/planning/goals")
            {
                Content = JsonContent.Create(goalRequest)
            };
            create.Headers.Add("X-User-Id", userId.ToString());
            using var response = await client.SendAsync(create);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        await CreateGoal(new CreateGoalRequest("Unlinked", 100m, "BOB"));
        var futureDate = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(2);
        await CreateGoal(new CreateGoalRequest("Tracked", 100m, "BOB", futureDate, bobAccount));
        await CreateGoal(new CreateGoalRequest("Shared tracked", 50m, "BOB", futureDate, bobAccount));

        using var list = new HttpRequestMessage(HttpMethod.Get, "/v1/planning/goals");
        list.Headers.Add("X-User-Id", userId.ToString());
        using var listed = await client.SendAsync(list);
        listed.StatusCode.Should().Be(HttpStatusCode.OK);
        using var goals = JsonDocument.Parse(await listed.Content.ReadAsStringAsync());
        var listedGoals = goals.RootElement.EnumerateArray().ToArray();
        var unlinked = listedGoals.Single(goal => goal.GetProperty("name").GetString() == "Unlinked");
        unlinked.GetProperty("trackingStatus").GetString().Should().Be("unlinked");
        unlinked.GetProperty("currentAmount").ValueKind.Should().Be(JsonValueKind.Null);
        unlinked.GetProperty("percentageAchieved").ValueKind.Should().Be(JsonValueKind.Null);
        unlinked.GetProperty("monthlyContributionNeeded").ValueKind.Should().Be(JsonValueKind.Null);

        var tracked = listedGoals.Single(goal => goal.GetProperty("name").GetString() == "Tracked");
        tracked.GetProperty("trackingStatus").GetString().Should().Be("tracked");
        tracked.GetProperty("accountName").GetString().Should().Be("Goal account");
        tracked.GetProperty("currentAmount").GetDecimal().Should().Be(25m);
        tracked.GetProperty("remainingAmount").GetDecimal().Should().Be(75m);
        tracked.GetProperty("monthlyContributionNeeded").GetDecimal().Should().BeGreaterThan(0m);
        tracked.GetProperty("sharedGoalCount").GetInt32().Should().Be(1);
    }
}
