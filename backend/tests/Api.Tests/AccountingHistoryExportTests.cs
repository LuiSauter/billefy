using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Identity.Contracts;
using Xunit;

namespace Api.Tests;

public sealed class AccountingHistoryExportTests
{
    [Theory]
    [InlineData("lending", "purchases", 1)]
    [InlineData("planning", "investmentTransactions", 2)]
    public async Task ExportAndReset_IncludeOwnedImmutableAccountingHistory_AndPreserveOtherOwner(
        string module, string collection, int expectedCount)
    {
        using var factory = new CustomWebApplicationFactory(shareAllFinancialModules: true);
        using var owner = await Login(factory);
        using var other = await Login(factory);
        var ownerId = Guid.Parse(owner.DefaultRequestHeaders.GetValues("X-User-Id").Single());
        await CreateHistory(owner);
        await CreateHistory(other);
        var beforeOther = (await Json(other, "/v1/auth/export")).GetProperty("financialData").GetRawText();

        var financial = (await Json(owner, "/v1/auth/export")).GetProperty("financialData");
        financial.GetProperty(module).TryGetProperty(collection, out var entries).Should().BeTrue(
            "immutable posted history must be present in an authenticated financial export");
        entries.GetArrayLength().Should().Be(expectedCount);
        foreach (var entry in entries.EnumerateArray())
        {
            entry.GetProperty("userId").GetGuid().Should().Be(ownerId);
            entry.GetProperty("id").GetGuid().Should().NotBeEmpty();
        }
        if (module == "lending")
        {
            entries[0].GetProperty("amount").GetDecimal().Should().Be(350m);
            entries[0].GetProperty("ledgerTransactionId").GetGuid().Should().NotBeEmpty();
        }
        else
        {
            var purchase = entries.EnumerateArray().Single(x => x.GetProperty("purchaseKey").ValueKind != JsonValueKind.Null);
            purchase.GetProperty("quantity").GetDecimal().Should().Be(5m);
            purchase.GetProperty("totalAmount").GetDecimal().Should().Be(600m);
            purchase.GetProperty("ledgerTransactionId").GetGuid().Should().NotBeEmpty();
            purchase.GetProperty("purchasePayloadHash").GetString().Should().HaveLength(64);
        }

        using var reset = await owner.DeleteAsync("/v1/auth/financial-data");
        reset.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var cleared = (await Json(owner, "/v1/auth/export")).GetProperty("financialData");
        cleared.GetProperty(module).GetProperty(collection).GetArrayLength().Should().Be(0);
        cleared.GetProperty("ledger").GetProperty("transactions").GetArrayLength().Should().Be(0);
        cleared.GetProperty("lending").GetProperty("loans").GetArrayLength().Should().Be(0);
        cleared.GetProperty("planning").GetProperty("investments").GetArrayLength().Should().Be(0);
        (await Json(other, "/v1/auth/export")).GetProperty("financialData").GetRawText().Should().Be(beforeOther);
        using var profile = await owner.GetAsync("/v1/auth/me");
        profile.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private static async Task<HttpClient> Login(CustomWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/v1/auth/google",
            new GoogleLoginRequest($"history_{Guid.NewGuid():N}@example.test", "BOB"));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Add("X-User-Id", json.GetProperty("user").GetProperty("id").GetGuid().ToString());
        return client;
    }

    private static async Task CreateHistory(HttpClient client)
    {
        var account = await Post(client, "/v1/accounts", new
        { name = "History bank", type = "Bank", currency = "BOB", initialBalance = 6000m });
        var accountId = account.GetProperty("id").GetGuid();
        var category = await Post(client, "/v1/categories", new { name = "Food history", direction = 2 });
        var card = await Post(client, "/v1/loans", new
        {
            counterpartyName = "History credit card", type = "Borrowed", template = "NoInterest",
            principal = 600m, currency = "BOB", interestRate = 0m, rateUnit = "Monthly",
            totalInstallments = 1, disbursementDate = "2027-01-01",
            originationKind = "OpeningBalance", loanKind = "CreditCard"
        });
        await Post(client, $"/v1/loans/{card.GetProperty("id").GetGuid()}/purchases", new
        {
            amount = 350m, currency = "BOB", categoryId = category.GetProperty("id").GetGuid(),
            occurredAt = "2027-01-07T00:00:00Z"
        }, Guid.NewGuid());
        var investment = await Post(client, "/v1/planning/investments", new
        {
            name = "History shares", kind = "stocks", iconKey = "trending-up", colorKey = "blue",
            currency = "BOB", quantity = 20m, currentValue = 2000m
        });
        await Post(client, $"/v1/planning/investments/{investment.GetProperty("id").GetGuid()}/operations", new
        {
            type = "Buy", quantity = 5m, unitPrice = 120m, totalAmount = 600m, fees = 0m,
            linkedAccountId = accountId, occurredAt = "2027-01-13T00:00:00Z"
        }, Guid.NewGuid());
    }

    private static async Task<JsonElement> Post(HttpClient client, string path, object body, Guid? key = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        if (key.HasValue) request.Headers.Add("Idempotency-Key", key.Value.ToString());
        using var response = await client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.Created, "{0}: {1}", path, text);
        using var document = JsonDocument.Parse(text);
        return document.RootElement.Clone();
    }

    private static async Task<JsonElement> Json(HttpClient client, string path)
    {
        using var response = await client.GetAsync(path);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).Clone();
    }
}
