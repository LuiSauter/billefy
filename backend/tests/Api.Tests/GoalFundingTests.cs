using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Ledger.Application.Accounts.Services;
using Ledger.Application.Transactions.Services;
using Ledger.Domain.Accounts;
using Ledger.Domain.Transactions;
using Xunit;

namespace Api.Tests;

public sealed class GoalFundingTests
{
    [Fact]
    public async Task AssignRelease_AreAppendOnlyIdempotent_AndCappedAcrossGoalsWithoutMovingCash()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = Client(factory);
        var account = await Account(client, 1000m);
        var goal = await Goal(client, account);
        var other = await Goal(client, account);
        var cashBefore = await Read(client, "/v1/accounts");
        var ledgerBefore = await Read(client, "/v1/transactions");
        var key = Guid.NewGuid();
        var date = new DateTimeOffset(2027, 1, 12, 12, 0, 0, TimeSpan.Zero);
        using var assigned = await Funding(client, goal, "assign", 700m, key, occurredAt: date);
        assigned.StatusCode.Should().Be(HttpStatusCode.Created);
        var originalBody = await assigned.Content.ReadAsStringAsync();
        using var repeat = await Funding(client, goal, "assign", 700m, key, occurredAt: date);
        repeat.StatusCode.Should().Be(HttpStatusCode.OK);
        (await repeat.Content.ReadAsStringAsync()).Should().Be(originalBody);
        var beforeRejected = await Snapshot(client, goal, other);
        using var changed = await Funding(client, goal, "assign", 701m, key, occurredAt: date);
        await Problem(changed, HttpStatusCode.Conflict, "GoalFunding.IdempotencyConflict");
        using var excessive = await Funding(client, other, "assign", 301m, Guid.NewGuid());
        await Problem(excessive, HttpStatusCode.Conflict, "GoalFunding.InsufficientFunds");
        (await Snapshot(client, goal, other)).Should().Equal(beforeRejected);
        using var exact = await Funding(client, other, "assign", 300m, Guid.NewGuid());
        exact.StatusCode.Should().Be(HttpStatusCode.Created);
        using var released = await Funding(client, goal, "release", 200m, Guid.NewGuid());
        released.StatusCode.Should().Be(HttpStatusCode.Created);
        using var reassign = await Funding(client, other, "assign", 200m, Guid.NewGuid());
        reassign.StatusCode.Should().Be(HttpStatusCode.Created);
        var beforeRelease = await Snapshot(client, goal, other);
        using var overRelease = await Funding(client, goal, "release", 501m, Guid.NewGuid());
        await Problem(overRelease, HttpStatusCode.Conflict, "GoalFunding.ExcessiveRelease");
        (await Snapshot(client, goal, other)).Should().Equal(beforeRelease);
        var entries = await Json(client, $"/v1/planning/goals/{goal}/funding");
        entries.GetArrayLength().Should().Be(2);
        var first = entries.EnumerateArray().Single(x => x.GetProperty("kind").GetString() == "assign");
        first.GetProperty("amount").GetDecimal().Should().Be(700m);
        first.GetProperty("occurredAt").GetDateTimeOffset().Should().Be(date);
        (await Read(client, "/v1/accounts")).Should().Be(cashBefore);
        (await Read(client, "/v1/transactions")).Should().Be(ledgerBefore);
        var current = (await Json(client, "/v1/planning/goals")).EnumerateArray().Single(x => x.GetProperty("id").GetGuid() == goal);
        current.GetProperty("currentAmount").GetDecimal().Should().Be(500m);
        current.GetProperty("accountReservedAmount").GetDecimal().Should().Be(1000m);
        current.GetProperty("accountFundingShortfall").GetDecimal().Should().Be(0m);
    }

    [Fact]
    public async Task SpendingIsAllowed_ExposesAccountShortfall_AndDoesNotSilentlyReleaseReservations()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = Client(factory);
        var account = await Account(client, 1000m);
        var goal = await Goal(client, account);
        using var assigned = await Funding(client, goal, "assign", 700m, Guid.NewGuid());
        assigned.StatusCode.Should().Be(HttpStatusCode.Created);
        var history = await Read(client, $"/v1/planning/goals/{goal}/funding");
        using var expense = await client.PostAsJsonAsync("/v1/transactions",
            new RegisterTransactionRequest(account, 500m, TransactionDirection.Expense));
        expense.StatusCode.Should().Be(HttpStatusCode.Created);
        var current = (await Json(client, "/v1/planning/goals")).EnumerateArray().Single();
        current.GetProperty("currentAmount").GetDecimal().Should().Be(700m);
        current.GetProperty("percentageAchieved").GetDecimal().Should().Be(35m);
        current.GetProperty("reservationStatus").GetString().Should().Be("underfunded");
        current.GetProperty("accountFundingShortfall").GetDecimal().Should().Be(200m);
        (await Read(client, $"/v1/planning/goals/{goal}/funding")).Should().Be(history);
        var before = await Snapshot(client, goal);
        using var more = await Funding(client, goal, "assign", 1m, Guid.NewGuid());
        await Problem(more, HttpStatusCode.Conflict, "GoalFunding.InsufficientFunds");
        (await Snapshot(client, goal)).Should().Equal(before);
    }

    [Theory]
    [InlineData(0, "BOB", "assign", true, "GoalFunding.InvalidAmount")]
    [InlineData(-1, "BOB", "assign", true, "GoalFunding.InvalidAmount")]
    [InlineData(0.001, "BOB", "assign", true, "GoalFunding.InvalidAmount")]
    [InlineData(1, "USD", "assign", true, "GoalFunding.CurrencyMismatch")]
    [InlineData(1, "BOB", "other", true, "GoalFunding.InvalidKind")]
    [InlineData(1, "BOB", "assign", false, "GoalFunding.IdempotencyKeyRequired")]
    public async Task InvalidInput_LeavesAllPublicStateUnchanged(decimal amount, string currency, string kind, bool hasKey, string code)
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = Client(factory);
        var goal = await Goal(client, await Account(client, 1000m));
        var before = await Snapshot(client, goal);
        using var rejected = await Funding(client, goal, kind, amount, hasKey ? Guid.NewGuid() : null, currency);
        await Problem(rejected, HttpStatusCode.BadRequest, code);
        (await Snapshot(client, goal)).Should().Equal(before);
    }

    [Fact]
    public async Task OwnershipModeAndHistoryGuards_PreserveExistingGoalAndAccountSemantics()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = Client(factory);
        using var foreign = Client(factory);
        using var anonymous = factory.CreateClient();
        var account = await Account(client, 1000m);
        var goal = await Goal(client, account);
        var legacy = await Goal(client, account, "AccountTracking");
        var before = await Snapshot(client, goal);
        using var wrongMode = await Funding(client, legacy, "assign", 1m, Guid.NewGuid());
        await Problem(wrongMode, HttpStatusCode.Conflict, "GoalFunding.InvalidMode");
        using var crossUser = await Funding(foreign, goal, "assign", 1m, Guid.NewGuid());
        await Problem(crossUser, HttpStatusCode.NotFound, "Goal.NotFound");
        using var unauthenticated = await Funding(anonymous, goal, "assign", 1m, Guid.NewGuid());
        unauthenticated.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await Snapshot(client, goal)).Should().Equal(before);
        using var assigned = await Funding(client, goal, "assign", 1m, Guid.NewGuid());
        assigned.StatusCode.Should().Be(HttpStatusCode.Created);
        var replacement = await Account(client, 1000m);
        var fundedState = await Snapshot(client, goal);
        using var relink = await client.PutAsJsonAsync($"/v1/planning/goals/{goal}", new
        {
            name = "Do not relink", targetAmount = 2000m, accountId = replacement
        });
        await Problem(relink, HttpStatusCode.Conflict, "Goal.FundingHistoryExists");
        using var delete = await client.DeleteAsync($"/v1/planning/goals/{goal}");
        await Problem(delete, HttpStatusCode.Conflict, "Goal.FundingHistoryExists");
        (await Snapshot(client, goal)).Should().Equal(fundedState);
    }

    internal static HttpClient Client(CustomWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-User-Id", Guid.NewGuid().ToString());
        return client;
    }
    internal static async Task<Guid> Account(HttpClient client, decimal balance)
    {
        using var response = await client.PostAsJsonAsync("/v1/accounts", new CreateAccountRequest("Savings", AccountType.Bank, "BOB", balance));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }
    internal static async Task<Guid> Goal(HttpClient client, Guid accountId, string mode = "ReservedFunds")
    {
        using var response = await client.PostAsJsonAsync("/v1/planning/goals", new
        {
            name = "Emergency", targetAmount = 2000m, currency = "BOB", accountId, fundingMode = mode
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }
    internal static async Task<HttpResponseMessage> Funding(HttpClient client, Guid goal, string kind, decimal amount, Guid? key,
        string currency = "BOB", DateTimeOffset? occurredAt = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"/v1/planning/goals/{goal}/funding/{kind}")
        { Content = JsonContent.Create(new { amount, currency, occurredAt }) };
        if (key.HasValue) request.Headers.Add("Idempotency-Key", key.Value.ToString());
        return await client.SendAsync(request);
    }
    internal static async Task<string> Read(HttpClient client, string path)
    {
        using var response = await client.GetAsync(path);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return await response.Content.ReadAsStringAsync();
    }
    internal static async Task<JsonElement> Json(HttpClient client, string path) =>
        JsonSerializer.Deserialize<JsonElement>(await Read(client, path));
    internal static async Task<string[]> Snapshot(HttpClient client, params Guid[] goals)
    {
        var values = new List<string> { await Read(client, "/v1/planning/goals"), await Read(client, "/v1/accounts"), await Read(client, "/v1/transactions") };
        foreach (var goal in goals) values.Add(await Read(client, $"/v1/planning/goals/{goal}/funding"));
        return values.ToArray();
    }
    internal static async Task Problem(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        response.StatusCode.Should().Be(status);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("title").GetString().Should().Be(code);
    }
}
