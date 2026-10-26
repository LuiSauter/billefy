using System.Net;
using System.Net.Http.Json;
using Api.Endpoints;
using BuildingBlocks.Currencies;
using FluentAssertions;
using Fx.Contracts;
using Fx.Domain.Rates;
using Fx.Infrastructure;
using Ledger.Domain.Accounts;
using Ledger.Domain.Transactions;
using Ledger.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Api.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _ledgerConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _fxConnection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _ledgerConnection.Open();
        _fxConnection.Open();

        // Clear connection string so Npgsql is not registered by default
        builder.UseSetting("ConnectionStrings:PostgreSQL", string.Empty);

        builder.ConfigureServices(services =>
        {
            // Register SQLite in-memory DbContexts
            services.AddDbContext<LedgerDbContext>(options => options.UseSqlite(_ledgerConnection));
            services.AddDbContext<FxDbContext>(options => options.UseSqlite(_fxConnection));

            // Ensure databases created and seed Fx market rate
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var ledgerDb = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
            ledgerDb.Database.EnsureCreated();

            var fxDb = scope.ServiceProvider.GetRequiredService<FxDbContext>();
            fxDb.Database.EnsureCreated();
            fxDb.ExchangeRates.Add(ExchangeRate.CreateMarketRate(
                Currency.BOB,
                Currency.USD,
                buyRate: 12.00m,
                sellRate: 11.50m,
                source: "DolarApi:BinanceP2P",
                fetchedAt: DateTime.UtcNow));
            fxDb.SaveChanges();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _ledgerConnection.Dispose();
        _fxConnection.Dispose();
    }
}

public class ApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly Guid _testUserId = Guid.NewGuid();

    public ApiIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetAccounts_WithoutUserId_ShouldReturnUnauthorized()
    {
        var response = await _client.GetAsync("/v1/accounts");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Accounts_And_Transactions_EndToEnd_ShouldWorkCorrectly()
    {
        using var requestMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
        {
            Content = JsonContent.Create(new CreateAccountRequest("Banco Sol", AccountType.Bank, "BOB", 500m))
        };
        requestMsg.Headers.Add("X-User-Id", _testUserId.ToString());

        // 1. Create Account
        var createResponse = await _client.SendAsync(requestMsg);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var createJson = await createResponse.Content.ReadFromJsonAsync<CreatedAccountResponse>();
        createJson.Should().NotBeNull();
        var accountId = createJson!.Id;

        // 2. Query Accounts
        using var listRequest = new HttpRequestMessage(HttpMethod.Get, "/v1/accounts");
        listRequest.Headers.Add("X-User-Id", _testUserId.ToString());
        var listResponse = await _client.SendAsync(listRequest);
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var accounts = await listResponse.Content.ReadFromJsonAsync<List<AccountDto>>();
        accounts.Should().NotBeNull();
        accounts!.Should().ContainSingle(a => a.Id == accountId && a.Balance == 500m);

        // 3. Register Expense Transaction
        using var txnRequest = new HttpRequestMessage(HttpMethod.Post, "/v1/transactions")
        {
            Content = JsonContent.Create(new RegisterTransactionRequest(
                accountId,
                150m,
                TransactionDirection.Expense,
                Description: "Compras supermercado"))
        };
        txnRequest.Headers.Add("X-User-Id", _testUserId.ToString());

        var txnResponse = await _client.SendAsync(txnRequest);
        txnResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var txnJson = await txnResponse.Content.ReadFromJsonAsync<CreatedTransactionResponse>();
        txnJson.Should().NotBeNull();
        var txnId = txnJson!.Id;

        // 4. Reverse Transaction
        using var revRequest = new HttpRequestMessage(HttpMethod.Post, $"/v1/transactions/{txnId}/reverse")
        {
            Content = JsonContent.Create(new ReverseTransactionRequest("Cancelado"))
        };
        revRequest.Headers.Add("X-User-Id", _testUserId.ToString());

        var revResponse = await _client.SendAsync(revRequest);
        revResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetLatestRate_ShouldReturnCurrentSnapshot()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/v1/rates/latest?currency=BOB&baseCurrency=USD");
        request.Headers.Add("X-User-Id", _testUserId.ToString());

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var rate = await response.Content.ReadFromJsonAsync<RateSnapshotDto>();
        rate.Should().NotBeNull();
        rate!.AppliedRate.Should().Be(12.00m); // Buy rate for BOB
        rate.RateSource.Should().Be("DolarApi:BinanceP2P");
    }

    [Fact]
    public async Task OpenApi_ShouldExposeValidSpecification()
    {
        var response = await _client.GetAsync("/openapi/v1.json");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("/v1/accounts");
        content.Should().Contain("/v1/transactions");
        content.Should().Contain("/v1/rates/latest");

        // Write to docs/openapi.json to keep contract updated
        var baseDir = AppContext.BaseDirectory;
        // Search up for docs directory
        var dir = new DirectoryInfo(baseDir);
        while (dir != null && !Directory.Exists(Path.Combine(dir.FullName, "docs")))
        {
            dir = dir.Parent;
        }

        if (dir != null)
        {
            var openApiPath = Path.Combine(dir.FullName, "docs", "openapi.json");
            await File.WriteAllTextAsync(openApiPath, content);
        }
    }

    private sealed record CreatedAccountResponse(Guid Id);
    private sealed record CreatedTransactionResponse(Guid Id);
}
