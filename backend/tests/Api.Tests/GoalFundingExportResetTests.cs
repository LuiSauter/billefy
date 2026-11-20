using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Identity.Contracts;
using Xunit;

namespace Api.Tests;

public sealed class GoalFundingExportResetTests
{
    [Fact]
    public async Task ExportIncludesHistory_ResetRemovesIt_AndOtherOwnerRemainsUnchanged()
    {
        using var factory = new CustomWebApplicationFactory(shareAllFinancialModules: true);
        using var owner = await Login(factory);
        using var other = await Login(factory);
        var goal = await GoalFundingTests.Goal(owner, await GoalFundingTests.Account(owner, 1000m));
        var otherGoal = await GoalFundingTests.Goal(other, await GoalFundingTests.Account(other, 1000m));
        using var assigned = await GoalFundingTests.Funding(owner, goal, "assign", 700m, Guid.NewGuid());
        assigned.StatusCode.Should().Be(HttpStatusCode.Created);
        using var assignedOther = await GoalFundingTests.Funding(other, otherGoal, "assign", 300m, Guid.NewGuid());
        assignedOther.StatusCode.Should().Be(HttpStatusCode.Created);
        var planning = (await GoalFundingTests.Json(owner, "/v1/auth/export")).GetProperty("financialData").GetProperty("planning");
        planning.GetProperty("goalFundingEntries").GetArrayLength().Should().Be(1);
        planning.GetProperty("goalFundingEntries")[0].GetProperty("signedAmount").GetDecimal().Should().Be(700m);
        planning.GetProperty("goalFundingAccounts").GetArrayLength().Should().Be(1);
        var otherBefore = await GoalFundingTests.Snapshot(other, otherGoal);
        using var reset = await owner.DeleteAsync("/v1/auth/financial-data");
        reset.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var cleared = (await GoalFundingTests.Json(owner, "/v1/auth/export")).GetProperty("financialData").GetProperty("planning");
        cleared.GetProperty("goalFundingEntries").GetArrayLength().Should().Be(0);
        cleared.GetProperty("goalFundingAccounts").GetArrayLength().Should().Be(0);
        cleared.GetProperty("goals").GetArrayLength().Should().Be(0);
        (await GoalFundingTests.Snapshot(other, otherGoal)).Should().Equal(otherBefore);
    }

    private static async Task<HttpClient> Login(CustomWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/v1/auth/google", new GoogleLoginRequest($"reserved_{Guid.NewGuid():N}@billefy.app", "BOB"));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Add("X-User-Id", body.GetProperty("user").GetProperty("id").GetGuid().ToString());
        return client;
    }
}
