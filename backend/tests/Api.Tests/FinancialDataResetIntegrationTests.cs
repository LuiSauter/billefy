using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Identity.Contracts;
using Ingestion.Contracts;
using Ledger.Application.Accounts.Services;
using Ledger.Contracts;
using Ledger.Domain.Accounts;
using Ledger.Infrastructure;
using Lending.Contracts;
using Microsoft.Extensions.DependencyInjection;
using Planning.Contracts;
using Xunit;

namespace Api.Tests;

public sealed class FinancialDataResetIntegrationTests
{
    [Fact]
    public async Task ResetFinancialData_RemovesOnlyTheAuthenticatedUsersFinancialRecords_AndKeepsTheirProfile()
    {
        using var factory = new CustomWebApplicationFactory(shareAllFinancialModules: true);
        using var client = factory.CreateClient();
        var owner = await LoginAsync(client, $"reset_owner_{Guid.NewGuid():N}@billefy.app");
        var other = await LoginAsync(client, $"reset_other_{Guid.NewGuid():N}@billefy.app");

        await CreateFinancialRecordsAsync(client, owner.User.Id);
        await CreateFinancialRecordsAsync(client, other.User.Id);

        using var ownerBefore = await GetExportAsync(client, owner.User.Id);
        AssertHasFinancialRecords(ownerBefore.RootElement.GetProperty("financialData"));

        using var request = new HttpRequestMessage(HttpMethod.Delete, "/v1/auth/financial-data");
        request.Headers.Add("X-User-Id", owner.User.Id.ToString());
        using var resetResponse = await client.SendAsync(request);
        var resetBody = await resetResponse.Content.ReadAsStringAsync();
        resetResponse.StatusCode.Should().Be(HttpStatusCode.NoContent, $"response body: {resetBody}");

        using var repeatedReset = await SendAsUserAsync(client, HttpMethod.Delete, "/v1/auth/financial-data", owner.User.Id);
        repeatedReset.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var ownerAfter = await GetExportAsync(client, owner.User.Id);
        AssertFinancialCollectionsEmpty(ownerAfter.RootElement.GetProperty("financialData"));
        ownerAfter.RootElement.GetProperty("user").GetProperty("id").GetGuid().Should().Be(owner.User.Id);
        ownerAfter.RootElement.GetProperty("user").GetProperty("preferredCurrency").GetString().Should().Be(owner.User.PreferredCurrency);

        using var profileResponse = await SendAsUserAsync(client, HttpMethod.Get, "/v1/auth/me", owner.User.Id);
        profileResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var profile = await profileResponse.Content.ReadFromJsonAsync<UserDto>();
        profile!.PreferredCurrency.Should().Be(owner.User.PreferredCurrency);

        using var otherAfter = await GetExportAsync(client, other.User.Id);
        AssertHasFinancialRecords(otherAfter.RootElement.GetProperty("financialData"));
    }

    [Fact]
    public async Task ResetFinancialData_WhenFinalModuleFails_RollsBackEveryModule()
    {
        using var factory = new CustomWebApplicationFactory(
            shareAllFinancialModules: true,
            configureServices: services =>
            {
                services.AddScoped<LedgerFinancialDataReset>();
                services.AddScoped<ILedgerFinancialDataReset>(provider =>
                    new FailingLedgerFinancialDataReset(provider.GetRequiredService<LedgerFinancialDataReset>()));
            });
        using var client = factory.CreateClient();
        var owner = await LoginAsync(client, $"reset_rollback_{Guid.NewGuid():N}@billefy.app");
        await CreateFinancialRecordsAsync(client, owner.User.Id);

        using var before = await GetExportAsync(client, owner.User.Id);
        AssertHasFinancialRecords(before.RootElement.GetProperty("financialData"));

        using var resetResponse = await SendAsUserAsync(client, HttpMethod.Delete, "/v1/auth/financial-data", owner.User.Id);
        resetResponse.StatusCode.Should().Be(HttpStatusCode.InternalServerError);

        using var after = await GetExportAsync(client, owner.User.Id);
        AssertHasFinancialRecords(after.RootElement.GetProperty("financialData"));
    }

    [Fact]
    public async Task ResetFinancialData_RequiresAuthentication()
    {
        using var factory = new CustomWebApplicationFactory(shareAllFinancialModules: true);
        using var client = factory.CreateClient();

        using var response = await client.DeleteAsync("/v1/auth/financial-data");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ResetFinancialData_ApiV1RouteReturnsNoContent()
    {
        using var factory = new CustomWebApplicationFactory(shareAllFinancialModules: true);
        using var client = factory.CreateClient();
        var owner = await LoginAsync(client, $"reset_api_alias_{Guid.NewGuid():N}@billefy.app");

        using var response = await SendAsUserAsync(client, HttpMethod.Delete,
            "/api/v1/auth/financial-data", owner.User.Id);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    private static async Task<AuthResponseDto> LoginAsync(HttpClient client, string email)
    {
        using var response = await client.PostAsJsonAsync("/v1/auth/google", new GoogleLoginRequest(email, "BOB"));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<AuthResponseDto>())!;
    }

    private static async Task CreateFinancialRecordsAsync(HttpClient client, Guid userId)
    {
        using (var response = await SendJsonAsUserAsync(client, HttpMethod.Post, "/v1/accounts",
            new CreateAccountRequest("Reset verification", AccountType.Bank, "BOB", 0m), userId))
            response.StatusCode.Should().Be(HttpStatusCode.Created);

        using (var response = await SendJsonAsUserAsync(client, HttpMethod.Post, "/v1/ingestion/events",
            new CreateRawEventRequest(Guid.NewGuid(), "notification", "com.example.bank",
                "Transferencia recibida por Bs. 25.00. Ref: RESET-VERIFICATION"), userId))
            response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        using (var response = await SendJsonAsUserAsync(client, HttpMethod.Post, "/v1/planning/budgets",
            new CreateBudgetRequest(100m, "BOB"), userId))
            response.StatusCode.Should().Be(HttpStatusCode.Created);

        using (var response = await SendJsonAsUserAsync(client, HttpMethod.Post, "/v1/loans",
            new CreateLoanRequest("Reset verification", "Lent", "SimpleOnBalance", 100m, "BOB", 0.05m,
                TotalInstallments: 1, DisbursementDate: DateOnly.FromDateTime(DateTime.UtcNow)), userId))
            response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    private static async Task<JsonDocument> GetExportAsync(HttpClient client, Guid userId)
    {
        using var response = await SendAsUserAsync(client, HttpMethod.Get, "/v1/auth/export", userId);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    }

    private static async Task<HttpResponseMessage> SendJsonAsUserAsync(HttpClient client, HttpMethod method, string path, object body, Guid userId)
    {
        var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-User-Id", userId.ToString());
        return await client.SendAsync(request);
    }

    private static async Task<HttpResponseMessage> SendAsUserAsync(HttpClient client, HttpMethod method, string path, Guid userId)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Add("X-User-Id", userId.ToString());
        return await client.SendAsync(request);
    }

    private static void AssertHasFinancialRecords(JsonElement financialData)
    {
        financialData.GetProperty("ledger").GetProperty("accounts").GetArrayLength().Should().BePositive();
        financialData.GetProperty("ingestion").GetProperty("rawEvents").GetArrayLength().Should().BePositive();
        financialData.GetProperty("lending").GetProperty("loans").GetArrayLength().Should().BePositive();
        financialData.GetProperty("planning").GetProperty("budgets").GetArrayLength().Should().BePositive();
    }

    private static void AssertFinancialCollectionsEmpty(JsonElement financialData)
    {
        AssertEmpty(financialData.GetProperty("ledger"), "accounts", "categories", "transactions", "allocations");
        AssertEmpty(financialData.GetProperty("ingestion"), "rawEvents", "drafts", "draftEvents", "financialSources", "imports");
        AssertEmpty(financialData.GetProperty("lending"), "loans", "installments", "payments", "paymentAllocations", "counterparties");
        AssertEmpty(financialData.GetProperty("planning"), "budgets", "goals", "investments", "investmentCashLinks", "distributionPlans");
    }

    private static void AssertEmpty(JsonElement module, params string[] collectionNames)
    {
        foreach (var collectionName in collectionNames)
        {
            module.GetProperty(collectionName).GetArrayLength().Should().Be(0, $"{collectionName} should be cleared");
        }
    }

    private sealed class FailingLedgerFinancialDataReset(LedgerFinancialDataReset inner) : ILedgerFinancialDataReset
    {
        public async Task ResetForUserAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            await inner.ResetForUserAsync(userId, cancellationToken);
            throw new InvalidOperationException("Injected failure after the Ledger reset.");
        }
    }
}
