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
using Ledger.Application.Accounts.Services;
using Ledger.Application.Transactions.Services;
using Ledger.Infrastructure;
using Ingestion.Contracts;
using Ingestion.Infrastructure;
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
    private readonly SqliteConnection _ingestionConnection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _ledgerConnection.Open();
        _fxConnection.Open();
        _ingestionConnection.Open();

        // Clear connection string so Npgsql is not registered by default
        builder.UseSetting("ConnectionStrings:PostgreSQL", string.Empty);

        builder.ConfigureServices(services =>
        {
            // Register SQLite in-memory DbContexts
            services.AddDbContext<LedgerDbContext>(options => options.UseSqlite(_ledgerConnection));
            services.AddDbContext<FxDbContext>(options => options.UseSqlite(_fxConnection));
            services.AddDbContext<IngestionDbContext>(options => options.UseSqlite(_ingestionConnection));

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

            var ingestionDb = scope.ServiceProvider.GetRequiredService<IngestionDbContext>();
            ingestionDb.Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _ledgerConnection.Dispose();
        _fxConnection.Dispose();
        _ingestionConnection.Dispose();
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
    public async Task GetTransactions_ShouldReturnFilteredTransactions()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/v1/transactions?limit=10");
        request.Headers.Add("X-User-Id", _testUserId.ToString());

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var txns = await response.Content.ReadFromJsonAsync<List<TransactionDto>>();
        txns.Should().NotBeNull();
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

    [Fact]
    public async Task IngestRawEvent_ShouldBeIdempotent_AndDeduplicateAcrossCalls()
    {
        var eventId1 = Guid.NewGuid();
        var requestPayload1 = new CreateRawEventRequest(
            EventId: eventId1,
            Channel: "notification",
            SourceId: "com.banco.union",
            MaskedText: "Transferencia recibida por Bs. 250.00 de Juan. Ref: TEST-DEDUP-001");

        // 1. Initial ingestion -> 202 Accepted, creates new draft
        using var postReq1 = new HttpRequestMessage(HttpMethod.Post, "/v1/ingestion/events")
        {
            Content = JsonContent.Create(requestPayload1)
        };
        postReq1.Headers.Add("X-User-Id", _testUserId.ToString());

        var res1 = await _client.SendAsync(postReq1);
        if (res1.StatusCode != HttpStatusCode.Accepted)
        {
            var err = await res1.Content.ReadAsStringAsync();
            throw new Exception($"Status {res1.StatusCode}: {err}");
        }

        var body1 = await res1.Content.ReadFromJsonAsync<RegisterEventResponse>();
        body1.Should().NotBeNull();
        body1!.IsNewEvent.Should().BeTrue();
        body1.IsDuplicate.Should().BeFalse();
        body1.DraftId.Should().NotBeNull();
        var draftId = body1.DraftId!.Value;

        // 2. Retry same eventId -> 200 OK (idempotent technical retry)
        using var retryReq = new HttpRequestMessage(HttpMethod.Post, "/v1/ingestion/events")
        {
            Content = JsonContent.Create(requestPayload1)
        };
        retryReq.Headers.Add("X-User-Id", _testUserId.ToString());

        var resRetry = await _client.SendAsync(retryReq);
        resRetry.StatusCode.Should().Be(HttpStatusCode.OK);
        var bodyRetry = await resRetry.Content.ReadFromJsonAsync<RegisterEventResponse>();
        bodyRetry!.IsNewEvent.Should().BeFalse();

        // 3. Ingest same movement from different channel (e.g. WhatsApp) with different eventId
        var eventId2 = Guid.NewGuid();
        var requestPayload2 = new CreateRawEventRequest(
            EventId: eventId2,
            Channel: "whatsapp",
            SourceId: "+59170000000",
            MaskedText: "Transferencia recibida por Bs. 250.00 Ref: TEST-DEDUP-001");

        using var postReq2 = new HttpRequestMessage(HttpMethod.Post, "/v1/ingestion/events")
        {
            Content = JsonContent.Create(requestPayload2)
        };
        postReq2.Headers.Add("X-User-Id", _testUserId.ToString());

        var res2 = await _client.SendAsync(postReq2);
        res2.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var body2 = await res2.Content.ReadFromJsonAsync<RegisterEventResponse>();
        body2!.IsDuplicate.Should().BeTrue("Movement with same reference and amount must be deduplicated across channels (ING-07).");
        body2.DraftId.Should().Be(draftId);
    }

    [Fact]
    public async Task DraftLifecycle_Confirm_ShouldCreateTransactionInLedger_AndMarkConfirmed()
    {
        // 1. Create an account to receive confirmed draft
        var createAccReq = new CreateAccountRequest("Cuenta Ingesta Test", AccountType.Bank, "BOB", 100m);
        using var accMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
        {
            Content = JsonContent.Create(createAccReq)
        };
        accMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var accRes = await _client.SendAsync(accMsg);
        accRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdAcc = await accRes.Content.ReadFromJsonAsync<CreatedAccountResponse>();
        var accountId = createdAcc!.Id;

        // 2. Ingest movement to create draft
        var eventId = Guid.NewGuid();
        var rawEvent = new CreateRawEventRequest(
            EventId: eventId,
            Channel: "notification",
            SourceId: "com.banco.union",
            MaskedText: "Pago realizado por 45.00 Bs en Farmacia. Ref: TX-CONFIRM-99");

        using var ingestMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/ingestion/events")
        {
            Content = JsonContent.Create(rawEvent)
        };
        ingestMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var ingestRes = await _client.SendAsync(ingestMsg);
        var ingestBody = await ingestRes.Content.ReadFromJsonAsync<RegisterEventResponse>();
        var draftId = ingestBody!.DraftId!.Value;

        // 3. Verify draft exists in pending inbox
        using var getDraftsMsg = new HttpRequestMessage(HttpMethod.Get, "/v1/drafts?status=pending");
        getDraftsMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var draftsRes = await _client.SendAsync(getDraftsMsg);
        draftsRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var drafts = await draftsRes.Content.ReadFromJsonAsync<List<DraftDto>>();
        drafts.Should().Contain(d => d.Id == draftId);

        // 4. Confirm draft
        var confirmReq = new ConfirmDraftRequest(accountId, null, "Gasto confirmado en farmacia");
        using var confirmMsg = new HttpRequestMessage(HttpMethod.Post, $"/v1/drafts/{draftId}/confirm")
        {
            Content = JsonContent.Create(confirmReq)
        };
        confirmMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var confirmRes = await _client.SendAsync(confirmMsg);
        confirmRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 5. Verify transaction is present in Ledger
        using var getTxnsMsg = new HttpRequestMessage(HttpMethod.Get, $"/v1/transactions?accountId={accountId}");
        getTxnsMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var txnsRes = await _client.SendAsync(getTxnsMsg);
        var txns = await txnsRes.Content.ReadFromJsonAsync<List<TransactionDto>>();
        txns.Should().Contain(t => t.Amount == 45.00m && t.Description == "Gasto confirmado en farmacia");
    }

    [Fact]
    public async Task DraftLifecycle_Discard_ShouldMarkDiscarded()
    {
        // 1. Ingest event
        var eventId = Guid.NewGuid();
        var rawEvent = new CreateRawEventRequest(
            EventId: eventId,
            Channel: "notification",
            SourceId: "com.banco.union",
            MaskedText: "Pago realizado por 10.00 Bs. Ref: TX-DISCARD-11");

        using var ingestMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/ingestion/events")
        {
            Content = JsonContent.Create(rawEvent)
        };
        ingestMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var ingestRes = await _client.SendAsync(ingestMsg);
        var ingestBody = await ingestRes.Content.ReadFromJsonAsync<RegisterEventResponse>();
        var draftId = ingestBody!.DraftId!.Value;

        // 2. Discard draft
        using var discardMsg = new HttpRequestMessage(HttpMethod.Post, $"/v1/drafts/{draftId}/discard");
        discardMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var discardRes = await _client.SendAsync(discardMsg);
        discardRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 3. Verify draft no longer in pending inbox
        using var getDraftsMsg = new HttpRequestMessage(HttpMethod.Get, "/v1/drafts?status=pending");
        getDraftsMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var draftsRes = await _client.SendAsync(getDraftsMsg);
        var drafts = await draftsRes.Content.ReadFromJsonAsync<List<DraftDto>>();
        drafts.Should().NotContain(d => d.Id == draftId);
    }

    private sealed record CreatedAccountResponse(Guid Id);
    private sealed record CreatedTransactionResponse(Guid Id);
}
