using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Api.Endpoints;
using FluentAssertions;
using Ledger.Domain.Accounts;
using Ledger.Application.Accounts.Services;
using Planning.Contracts;
using Xunit;

namespace Api.Tests;

public sealed class ReservedGoalModeTests
{
    [Fact]
    public async Task ReservedGoal_StartsAtZero_PersistsModeOnUpdate_AndDoesNotMoveMoney()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = CreateClient(factory);
        var accountId = await CreateAccount(client);
        var accountsBefore = await Read(client, "/v1/accounts");
        var transactionsBefore = await Read(client, "/v1/transactions");

        // Omission keeps the existing whole-account semantics, even alongside a reserved goal.
        using var legacy = await client.PostAsJsonAsync("/v1/planning/goals",
            new CreateGoalRequest("Legacy tracking", 2000m, "BOB", AccountId: accountId));
        legacy.StatusCode.Should().Be(HttpStatusCode.Created);
        using var response = await client.PostAsJsonAsync("/v1/planning/goals", new
        {
            name = "Emergency fund", targetAmount = 2000m, currency = "BOB",
            accountId, fundingMode = "ReservedFunds"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var goals = await Goals(client);
        var reserved = goals.Single(g => g.GetProperty("id").GetGuid() == id);
        AssertZeroReservation(reserved, 2000m);
        var tracked = goals.Single(g => g.GetProperty("name").GetString() == "Legacy tracking");
        tracked.GetProperty("fundingMode").GetString().Should().Be("AccountTracking");
        tracked.GetProperty("currentAmount").GetDecimal().Should().Be(4000m);
        tracked.GetProperty("percentageAchieved").GetDecimal().Should().Be(200m);

        using var update = await client.PutAsJsonAsync($"/v1/planning/goals/{id}",
            new UpdateGoalRequest("Updated emergency fund", 2500m, AccountId: accountId));
        update.StatusCode.Should().Be(HttpStatusCode.OK);
        AssertZeroReservation((await Goals(client)).Single(g => g.GetProperty("id").GetGuid() == id), 2500m);
        (await Read(client, "/v1/accounts")).Should().Be(accountsBefore);
        (await Read(client, "/v1/transactions")).Should().Be(transactionsBefore);
    }

    [Theory]
    [InlineData("Unknown")]
    [InlineData("1")]
    [InlineData("")]
    [InlineData(null)]
    public async Task InvalidMode_IsRejectedWithoutMutation(string? fundingMode)
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = CreateClient(factory);
        var accountId = await CreateAccount(client);
        var before = await Snapshot(client);
        using var response = await client.PostAsJsonAsync("/v1/planning/goals", new
        {
            name = "Invalid mode", targetAmount = 2000m, currency = "BOB", accountId, fundingMode
        });
        await AssertProblem(response, HttpStatusCode.BadRequest, "Goal.InvalidFundingMode");
        (await Snapshot(client)).Should().Equal(before);
    }

    [Fact]
    public async Task ReservedGoal_RequiresOwnedMatchingAccount_AndCannotBeUnlinkedByLegacyUpdate()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = CreateClient(factory);
        using var otherClient = CreateClient(factory);
        var accountId = await CreateAccount(client);
        var foreignId = await CreateAccount(otherClient);
        var before = await Snapshot(client);

        foreach (var (linkedAccount, currency, status, code) in new[]
        {
            ((Guid?)null, "BOB", HttpStatusCode.BadRequest, "Goal.AccountRequired"),
            ((Guid?)foreignId, "BOB", HttpStatusCode.NotFound, "Goal.AccountNotFound"),
            ((Guid?)accountId, "USD", HttpStatusCode.BadRequest, "Goal.CurrencyMismatch")
        })
        {
            using var rejected = await client.PostAsJsonAsync("/v1/planning/goals", new
            {
                name = "Rejected reservation", targetAmount = 2000m, currency,
                accountId = linkedAccount, fundingMode = "ReservedFunds"
            });
            await AssertProblem(rejected, status, code);
            (await Snapshot(client)).Should().Equal(before);
        }

        using var created = await client.PostAsJsonAsync("/v1/planning/goals", new
        {
            name = "Emergency fund", targetAmount = 2000m, currency = "BOB",
            accountId, fundingMode = "ReservedFunds"
        });
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var beforeUpdate = await Snapshot(client);
        using var update = await client.PutAsJsonAsync($"/v1/planning/goals/{id}",
            new UpdateGoalRequest("Should not change", 2500m));
        await AssertProblem(update, HttpStatusCode.BadRequest, "Goal.AccountRequired");
        (await Snapshot(client)).Should().Equal(beforeUpdate);
    }

    private static HttpClient CreateClient(CustomWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-User-Id", Guid.NewGuid().ToString());
        return client;
    }

    private static async Task<Guid> CreateAccount(HttpClient client)
    {
        using var response = await client.PostAsJsonAsync("/v1/accounts",
            new CreateAccountRequest("Savings", AccountType.Bank, "BOB", 4000m));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static async Task<string> Read(HttpClient client, string path)
    {
        using var response = await client.GetAsync(path);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return await response.Content.ReadAsStringAsync();
    }

    private static async Task<string[]> Snapshot(HttpClient client) =>
        [await Read(client, "/v1/planning/goals"), await Read(client, "/v1/accounts"), await Read(client, "/v1/transactions")];

    private static async Task<JsonElement[]> Goals(HttpClient client) =>
        JsonSerializer.Deserialize<JsonElement>(await Read(client, "/v1/planning/goals")).EnumerateArray().ToArray();

    private static async Task AssertProblem(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        response.StatusCode.Should().Be(status);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("title").GetString().Should().Be(code);
    }

    private static void AssertZeroReservation(JsonElement goal, decimal target)
    {
        goal.GetProperty("fundingMode").GetString().Should().Be("ReservedFunds");
        goal.GetProperty("trackingStatus").GetString().Should().Be("tracked");
        goal.GetProperty("currentAmount").GetDecimal().Should().Be(0m);
        goal.GetProperty("remainingAmount").GetDecimal().Should().Be(target);
        goal.GetProperty("percentageAchieved").GetDecimal().Should().Be(0m);
    }
}
