using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Planning.Domain.Distribution;
using Planning.Domain.Budgets;
using Api.Endpoints;
using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Fx.Contracts;
using Fx.Domain.Rates;
using Fx.Infrastructure;
using Ledger.Domain.Accounts;
using Ledger.Domain.Transactions;
using Ledger.Application.Accounts.Services;
using Ledger.Application.Categories.Services;
using Ledger.Application.Transactions.Services;
using Ingestion.Application.Services;
using Ledger.Infrastructure;
using Ingestion.Contracts;
using Ingestion.Infrastructure;
using Lending.Contracts;
using Lending.Infrastructure;
using Planning.Contracts;
using Planning.Infrastructure;
using Planning.Application.Services;
using Messaging.Contracts;
using Messaging.Infrastructure;
using Identity.Contracts;
using Identity.Infrastructure;
using Notifications.Contracts;
using Notifications.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Api.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _ledgerConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _fxConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _ingestionConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _planningConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _messagingConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _identityConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _notificationsConnection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _ledgerConnection.Open();
        _fxConnection.Open();
        _ingestionConnection.Open();
        _planningConnection.Open();
        _messagingConnection.Open();
        _identityConnection.Open();
        _notificationsConnection.Open();

        // Clear connection string so Npgsql is not registered by default
        builder.UseSetting("ConnectionStrings:PostgreSQL", string.Empty);

        builder.ConfigureServices(services =>
        {
            // Register SQLite in-memory DbContexts
            services.AddDbContext<LedgerDbContext>(options => options.UseSqlite(_ledgerConnection));
            services.AddDbContext<FxDbContext>(options => options.UseSqlite(_fxConnection));
            services.AddDbContext<IngestionDbContext>(options => options.UseSqlite(_ingestionConnection));
            services.AddDbContext<LendingDbContext>(options => options.UseSqlite(_ledgerConnection));
            services.AddDbContext<PlanningDbContext>(options => options.UseSqlite(_planningConnection));
            services.AddDbContext<MessagingDbContext>(options => options.UseSqlite(_messagingConnection));
            services.AddDbContext<IdentityDbContext>(options => options.UseSqlite(_identityConnection));
            services.AddDbContext<NotificationsDbContext>(options => options.UseSqlite(_notificationsConnection));

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

            var lendingDb = scope.ServiceProvider.GetRequiredService<LendingDbContext>();
            lendingDb.Database.GetService<IRelationalDatabaseCreator>().CreateTables();

            var planningDb = scope.ServiceProvider.GetRequiredService<PlanningDbContext>();
            planningDb.Database.EnsureCreated();

            var messagingDb = scope.ServiceProvider.GetRequiredService<MessagingDbContext>();
            messagingDb.Database.EnsureCreated();

            var identityDb = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
            identityDb.Database.EnsureCreated();

            var notificationsDb = scope.ServiceProvider.GetRequiredService<NotificationsDbContext>();
            notificationsDb.Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _ledgerConnection.Dispose();
        _fxConnection.Dispose();
        _ingestionConnection.Dispose();
        _planningConnection.Dispose();
        _messagingConnection.Dispose();
        _identityConnection.Dispose();
        _notificationsConnection.Dispose();
    }
}

public class ApiIntegrationTests : IDisposable
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;
    private readonly Guid _testUserId = Guid.NewGuid();

    public ApiIntegrationTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
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
        using var specification = JsonDocument.Parse(content);
        var bucketSchema = specification.RootElement.GetProperty("components").GetProperty("schemas").GetProperty("PlanBucketDto");
        bucketSchema.GetProperty("required").EnumerateArray().Select(p => p.GetString()).Should().NotContain("trackingMode");
        var trackingSchema = bucketSchema.GetProperty("properties").GetProperty("trackingMode");
        trackingSchema.GetProperty("type").GetString().Should().Be("string");
        trackingSchema.GetProperty("default").GetString().Should().Be("Expenses");
        trackingSchema.GetProperty("description").GetString().Should().Contain("Expenses").And.Contain("TargetOnly")
            .And.Contain("requires no assigned categories").And.Contain("explicit null and other values are rejected");

        var budgetUpdate = specification.RootElement.GetProperty("paths")
            .GetProperty("/v1/planning/budgets/{id}").GetProperty("put");
        budgetUpdate.GetProperty("operationId").GetString().Should().Be("UpdateBudget");
        budgetUpdate.GetProperty("responses").EnumerateObject().Select(p => p.Name)
            .Should().BeEquivalentTo("204", "400", "401", "404");
        var updateSchema = specification.RootElement.GetProperty("components").GetProperty("schemas")
            .GetProperty("UpdateBudgetRequest");
        updateSchema.GetProperty("properties").EnumerateObject().Select(p => p.Name)
            .Should().BeEquivalentTo("limitAmount", "alertThreshold");
        updateSchema.GetProperty("required").EnumerateArray().Select(p => p.GetString())
            .Should().BeEquivalentTo("limitAmount", "alertThreshold");
        updateSchema.GetProperty("properties").GetProperty("limitAmount").GetProperty("description")
            .GetString().Should().Contain("existing currency units").And.Contain("strictly positive after rounding");
        updateSchema.GetProperty("properties").GetProperty("alertThreshold").GetProperty("description")
            .GetString().Should().Contain("greater than 0 and at most 1").And.Contain("0.80 means 80%");

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

    [Fact]
    public async Task AccountReconciliation_ShouldCreateAdjustmentTransaction_ToMatchRealBalance()
    {
        // 1. Create account with initial balance 100
        var createAccReq = new CreateAccountRequest("Cuenta Reconciliación", AccountType.Bank, "BOB", 100m);
        using var accMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
        {
            Content = JsonContent.Create(createAccReq)
        };
        accMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var accRes = await _client.SendAsync(accMsg);
        var createdAcc = await accRes.Content.ReadFromJsonAsync<CreatedAccountResponse>();
        var accountId = createdAcc!.Id;

        // 2. Reconcile with real balance 80 (difference of -20 BOB)
        var reconcileReq = new ReconcileAccountRequest(80m, "Ajuste extracto bancario");
        using var recMsg = new HttpRequestMessage(HttpMethod.Post, $"/v1/accounts/{accountId}/reconcile")
        {
            Content = JsonContent.Create(reconcileReq)
        };
        recMsg.Headers.Add("X-User-Id", _testUserId.ToString());

        var recRes = await _client.SendAsync(recMsg);
        recRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var recResult = await recRes.Content.ReadFromJsonAsync<ReconciliationResult>();
        recResult.Should().NotBeNull();
        recResult!.PreviousBalance.Should().Be(100m);
        recResult.RealBalance.Should().Be(80m);
        recResult.Difference.Should().Be(-20m);
        recResult.AdjustmentTransactionId.Should().NotBeNull();

        // 3. Check derived balance of the account is now exactly 80
        using var getAccMsg = new HttpRequestMessage(HttpMethod.Get, "/v1/accounts");
        getAccMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var getAccRes = await _client.SendAsync(getAccMsg);
        var accounts = await getAccRes.Content.ReadFromJsonAsync<List<AccountDto>>();
        var updatedAcc = accounts!.First(a => a.Id == accountId);
        updatedAcc.Balance.Should().Be(80m, "Reconciliation must adjust derived account balance to match real balance (ACC-06).");
    }

    [Fact]
    public async Task StatementImportCsv_ShouldParseRows_AndWarnOnDuplicateFile()
    {
        // 1. Create account
        var createAccReq = new CreateAccountRequest("Cuenta Extracto CSV", AccountType.Bank, "BOB", 0m);
        using var accMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
        {
            Content = JsonContent.Create(createAccReq)
        };
        accMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var accRes = await _client.SendAsync(accMsg);
        var createdAcc = await accRes.Content.ReadFromJsonAsync<CreatedAccountResponse>();
        var accountId = createdAcc!.Id;

        // 2. CSV content with 2 movements
        const string csvData = """
        Fecha,Descripción,Monto,Referencia
        2026-10-20,Pago Supermercado,-120.50,TX-CSV-01
        2026-10-21,Depósito Sueldo,3500.00,TX-CSV-02
        """;

        var importReq = new ImportStatementCsvRequest(
            AccountId: accountId,
            FileName: "extracto_octubre.csv",
            CsvContent: csvData,
            Currency: "BOB");

        using var postImportMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/ingestion/statements/import-csv")
        {
            Content = JsonContent.Create(importReq)
        };
        postImportMsg.Headers.Add("X-User-Id", _testUserId.ToString());

        var importRes = await _client.SendAsync(postImportMsg);
        importRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await importRes.Content.ReadFromJsonAsync<StatementImportResult>();
        result.Should().NotBeNull();
        result!.TotalRows.Should().Be(2);
        result.DraftsCreated.Should().Be(2);
        result.IsDuplicateFile.Should().BeFalse();

        // 3. Re-import identical file -> warning triggered (ING-11)
        using var retryImportMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/ingestion/statements/import-csv")
        {
            Content = JsonContent.Create(importReq)
        };
        retryImportMsg.Headers.Add("X-User-Id", _testUserId.ToString());

        var retryRes = await _client.SendAsync(retryImportMsg);
        retryRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var retryResult = await retryRes.Content.ReadFromJsonAsync<StatementImportResult>();
        retryResult!.IsDuplicateFile.Should().BeTrue("Repeated file import must trigger duplicate warning (ING-11).");
        retryResult.Warning.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task StatementImportPdf_ShouldParseTextRows_AndCreateDrafts()
    {
        var accReq = new CreateAccountRequest("Banco Unión PDF", AccountType.Bank, "BOB", 0m);
        using var createAccMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
        {
            Content = JsonContent.Create(accReq)
        };
        createAccMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var accRes = await _client.SendAsync(createAccMsg);
        var accDto = await accRes.Content.ReadFromJsonAsync<CreatedAccountResponse>();

        var pdfText = "ESTADO DE CUENTA BANCO UNION\n2025-05-12 Farmacia Farmacorp -85.50 REF-887711\n2025-05-13 Transferencia Recibida Juan 1500.00 TR-223344\n2025-05-14 Retiro Cajero Automatico -200.00 ATM-990011";

        var pdfReq = new ImportStatementPdfRequest(accDto!.Id, "extracto_mayo.pdf", pdfText, "BOB");
        using var importMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/ingestion/statements/import-pdf")
        {
            Content = JsonContent.Create(pdfReq)
        };
        importMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var importRes = await _client.SendAsync(importMsg);
        importRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await importRes.Content.ReadFromJsonAsync<StatementImportResult>();
        result.Should().NotBeNull();
        result!.DraftsCreated.Should().Be(3);
        result.TotalRows.Should().Be(3);
    }

    [Fact]
    public async Task LoanLifecycle_SimulateCreateAndRegisterPayment_ShouldCascadeAllocate()
    {
        // 1. Simulate Loan
        var simReq = new SimulateLoanRequest(
            Principal: 1000m,
            Rate: 0.05m,
            RateUnit: "Monthly",
            DayCount: "Thirty360",
            Frequency: "Monthly",
            Template: "SimpleOnBalance",
            TotalInstallments: 4,
            DisbursementDate: new DateOnly(2026, 1, 1));

        using var simMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/loans/simulate")
        {
            Content = JsonContent.Create(simReq)
        };
        var simRes = await _client.SendAsync(simMsg);
        simRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var simSchedule = await simRes.Content.ReadFromJsonAsync<LoanScheduleDto>();
        simSchedule!.TotalInterest.Should().Be(125.00m);
        simSchedule.AnnualEffectiveRate.Should().Be(0.795856m);

        // 2. Create Loan (Vector C)
        var createLoanReq = new CreateLoanRequest(
            CounterpartyName: "Carlos Méndez",
            Type: "Lent",
            Template: "SimpleOnBalance",
            Principal: 1000m,
            Currency: "BOB",
            InterestRate: 0.05m,
            RateUnit: "Monthly",
            DayCount: "Thirty360",
            Frequency: "Monthly",
            TotalInstallments: 4,
            DisbursementDate: new DateOnly(2026, 1, 1),
            LateRate: 0.03m,
            GraceDays: 0);

        using var createMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/loans")
        {
            Content = JsonContent.Create(createLoanReq)
        };
        createMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var createRes = await _client.SendAsync(createMsg);
        createRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdLoan = await createRes.Content.ReadFromJsonAsync<CreatedLoanResponse>();
        var loanId = createdLoan!.Id;

        // 3. Query Loan details
        using var getLoanMsg = new HttpRequestMessage(HttpMethod.Get, $"/v1/loans/{loanId}");
        getLoanMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var getLoanRes = await _client.SendAsync(getLoanMsg);
        getLoanRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var loanDetails = await getLoanRes.Content.ReadFromJsonAsync<LoanDetailDto>();
        loanDetails!.Summary.RemainingPrincipal.Should().Be(1000m);
        loanDetails.Installments.Should().HaveCount(4);

        // 4. Register Payment 10 days late (Vector H)
        // Installment 1 due on 2026-02-01, payment on 2026-02-11 (10 days late)
        var payReq = new RegisterLoanPaymentRequest(
            Amount: 100.00m,
            PaymentDate: new DateTime(2026, 2, 11, 12, 0, 0, DateTimeKind.Utc),
            AccountId: null,
            Note: "Primer pago parcial");

        using var payMsg = new HttpRequestMessage(HttpMethod.Post, $"/v1/loans/{loanId}/payments")
        {
            Content = JsonContent.Create(payReq)
        };
        payMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var payRes = await _client.SendAsync(payMsg);
        if (payRes.StatusCode != HttpStatusCode.OK)
        {
            var err = await payRes.Content.ReadAsStringAsync();
            throw new Exception($"Pay error: {err}");
        }

        var payResult = await payRes.Content.ReadFromJsonAsync<LoanPaymentResultDto>();
        payResult.Should().NotBeNull();
        payResult!.Allocations.Should().HaveCount(1);
        var alloc = payResult.Allocations[0];
        alloc.ToLateInterest.Should().Be(2.50m);
        alloc.ToInterest.Should().Be(50.00m);
        alloc.ToPrincipal.Should().Be(47.50m);
        payResult.RemainingPrincipal.Should().Be(952.50m); // 1000 - 47.50
    }

    [Fact]
    public async Task Planning_BudgetsGoalsAndFinancialHealth_ShouldCalculateAccurately()
    {
        // 1. Create a monthly budget
        var createBudgetReq = new CreateBudgetRequest(
            LimitAmount: 500m,
            Currency: "BOB",
            AlertThreshold: 0.80m);

        using var budgetMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/planning/budgets")
        {
            Content = JsonContent.Create(createBudgetReq)
        };
        budgetMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var budgetRes = await _client.SendAsync(budgetMsg);
        budgetRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // 2. Query budgets
        using var getBudgetsMsg = new HttpRequestMessage(HttpMethod.Get, "/v1/planning/budgets");
        getBudgetsMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var getBudgetsRes = await _client.SendAsync(getBudgetsMsg);
        getBudgetsRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var budgets = await getBudgetsRes.Content.ReadFromJsonAsync<List<BudgetDto>>();
        budgets.Should().NotBeEmpty();
        var budget = budgets!.First();
        budget.LimitAmount.Should().Be(500m);
        budget.AlertThreshold.Should().Be(0.80m);

        // 3. Create a savings goal linked to an active same-currency account.
        using var goalAccountMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
        {
            Content = JsonContent.Create(new CreateAccountRequest("Ahorros", AccountType.Bank, "BOB", 0m))
        };
        goalAccountMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var goalAccountRes = await _client.SendAsync(goalAccountMsg);
        goalAccountRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var goalAccountId = (await goalAccountRes.Content.ReadFromJsonAsync<CreatedAccountResponse>())!.Id;

        var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(5));
        var createGoalReq = new CreateGoalRequest(
            Name: "Fondo de Emergencia",
            TargetAmount: 3000m,
            Currency: "BOB",
            TargetDate: targetDate,
            AccountId: goalAccountId);

        using var goalMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/planning/goals")
        {
            Content = JsonContent.Create(createGoalReq)
        };
        goalMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var goalRes = await _client.SendAsync(goalMsg);
        goalRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // 4. Query goals
        using var getGoalsMsg = new HttpRequestMessage(HttpMethod.Get, "/v1/planning/goals");
        getGoalsMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var getGoalsRes = await _client.SendAsync(getGoalsMsg);
        getGoalsRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var goals = await getGoalsRes.Content.ReadFromJsonAsync<List<GoalDto>>();
        goals.Should().Contain(g => g.Name == "Fondo de Emergencia");
        var goal = goals!.First(g => g.Name == "Fondo de Emergencia");
        goal.MonthlyContributionNeeded.Should().BeGreaterThan(0m);

        // 5. Query Financial Health
        using var healthMsg = new HttpRequestMessage(HttpMethod.Get, "/v1/planning/financial-health");
        healthMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var healthRes = await _client.SendAsync(healthMsg);
        healthRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var health = await healthRes.Content.ReadFromJsonAsync<FinancialHealthDto>();
        health.Should().NotBeNull();
        health!.Currencies.Should().NotBeNull();
    }

    [Theory]
    [InlineData("BOB", true, 0.01)]
    [InlineData("USD", false, 0.80)]
    [InlineData("BOB", false, 1.00)]
    public async Task UpdateBudget_Owner_ShouldPersistLimitAndThreshold_AndPreserveMetadata(
        string currency, bool categorized, decimal threshold)
    {
        var original = await CreateBudgetFixtureAsync(currency, categorized);
        using var response = await PutBudgetAsync(original.Id, _testUserId, 275.55m, threshold);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await response.Content.ReadAsStringAsync()).Should().BeEmpty();

        var persisted = await ReadBudgetFixtureAsync();
        persisted.Should().BeEquivalentTo(original, options => options
            .Excluding(b => b.LimitAmount).Excluding(b => b.AlertThreshold));
        persisted.LimitAmount.Should().Be(Money.Of(275.55m, original.LimitAmount.Currency));
        persisted.AlertThreshold.Should().Be(threshold);

        using var request = new HttpRequestMessage(HttpMethod.Get, "/v1/planning/budgets");
        request.Headers.Add("X-User-Id", _testUserId.ToString());
        using var listed = await _client.SendAsync(request);
        listed.StatusCode.Should().Be(HttpStatusCode.OK);
        var budget = (await listed.Content.ReadFromJsonAsync<List<BudgetDto>>())!.Should().ContainSingle().Subject;
        budget.Id.Should().Be(original.Id);
        budget.CategoryId.Should().Be(original.CategoryId);
        budget.Currency.Should().Be(currency);
        budget.Period.Should().Be(original.Period);
        budget.CreatedAt.Should().Be(original.CreatedAt);
        budget.IsActive.Should().BeTrue();
        budget.LimitAmount.Should().Be(275.55m);
        budget.AlertThreshold.Should().Be(threshold);
    }

    [Theory]
    [InlineData(0, 0.8, "Budget.InvalidLimit")]
    [InlineData(-1, 0.8, "Budget.InvalidLimit")]
    [InlineData(0.001, 0.8, "Budget.InvalidLimit")]
    [InlineData(275, 0, "Budget.InvalidAlertThreshold")]
    [InlineData(275, -0.01, "Budget.InvalidAlertThreshold")]
    [InlineData(275, 1.01, "Budget.InvalidAlertThreshold")]
    public async Task UpdateBudget_InvalidInput_ShouldReturnValidation_WithoutMutation(
        decimal limit, decimal threshold, string errorCode)
    {
        var original = await CreateBudgetFixtureAsync();
        using var response = await PutBudgetAsync(original.Id, _testUserId, limit, threshold);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("title").GetString().Should().Be(errorCode);
        problem.GetProperty("detail").GetString().Should().NotBeNullOrWhiteSpace();
        (await ReadBudgetFixtureAsync()).Should().BeEquivalentTo(original);
    }

    [Theory]
    [InlineData("{\"limitAmount\":275}")]
    [InlineData("{\"alertThreshold\":0.8}")]
    [InlineData("{\"limitAmount\":275,\"alertThreshold\":null}")]
    public async Task UpdateBudget_IncompleteBody_ShouldReturnBadRequest_WithoutMutation(string json)
    {
        var original = await CreateBudgetFixtureAsync();
        using var request = new HttpRequestMessage(HttpMethod.Put, $"/v1/planning/budgets/{original.Id}")
        {
            Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
        };
        request.Headers.Add("X-User-Id", _testUserId.ToString());
        using var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await ReadBudgetFixtureAsync()).Should().BeEquivalentTo(original);
    }

    [Theory]
    [InlineData("missing", false, HttpStatusCode.NotFound)]
    [InlineData("missing", true, HttpStatusCode.NotFound)]
    [InlineData("foreign", false, HttpStatusCode.NotFound)]
    [InlineData("foreign", true, HttpStatusCode.NotFound)]
    [InlineData("unauthenticated", false, HttpStatusCode.Unauthorized)]
    [InlineData("unauthenticated", true, HttpStatusCode.Unauthorized)]
    [InlineData("inactive", false, HttpStatusCode.NotFound)]
    [InlineData("inactive", true, HttpStatusCode.NotFound)]
    public async Task UpdateBudget_Inaccessible_ShouldRejectBeforeValidation_WithoutMutation(
        string scenario, bool invalidInput, HttpStatusCode expected)
    {
        var original = await CreateBudgetFixtureAsync(active: scenario != "inactive");
        var id = scenario == "missing" ? Guid.NewGuid() : original.Id;
        Guid? caller = scenario == "unauthenticated" ? null
            : scenario == "foreign" ? Guid.NewGuid() : _testUserId;
        using var response = await PutBudgetAsync(id, caller, invalidInput ? 0m : 275m, invalidInput ? 0m : 0.9m);
        response.StatusCode.Should().Be(expected);
        if (expected == HttpStatusCode.NotFound)
        {
            var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
            problem.GetProperty("title").GetString().Should().Be("Budget.NotFound");
        }
        (await ReadBudgetFixtureAsync()).Should().BeEquivalentTo(original);
    }

    private async Task<Budget> CreateBudgetFixtureAsync(string currency = "BOB", bool categorized = true, bool active = true)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PlanningDbContext>();
        db.Database.ProviderName.Should().Be("Microsoft.EntityFrameworkCore.Sqlite");
        var budget = new Budget(Guid.NewGuid(), _testUserId, categorized ? Guid.NewGuid() : null,
            "monthly", Money.Of(100m, Currency.FromCode(currency)), 0.8m, active,
            new DateTime(2025, 1, 15, 12, 0, 0, DateTimeKind.Utc));
        db.Budgets.Add(budget);
        await db.SaveChangesAsync();
        return budget;
    }

    private async Task<Budget> ReadBudgetFixtureAsync()
    {
        // Fresh scope proves database persistence, not just a tracked entity change; Single also guards against recreation.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PlanningDbContext>();
        db.Database.ProviderName.Should().Be("Microsoft.EntityFrameworkCore.Sqlite");
        return await db.Budgets.IgnoreQueryFilters().AsNoTracking().SingleAsync();
    }

    private async Task<HttpResponseMessage> PutBudgetAsync(Guid id, Guid? caller, decimal limit, decimal threshold)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, $"/v1/planning/budgets/{id}")
        {
            Content = JsonContent.Create(new { limitAmount = limit, alertThreshold = threshold })
        };
        if (caller.HasValue) request.Headers.Add("X-User-Id", caller.Value.ToString());
        return await _client.SendAsync(request);
    }

    [Theory]
    [InlineData("BOB", "BOB", false)]
    [InlineData("BOB", "BOB", true)]
    [InlineData("BOB", "USD", false)]
    [InlineData("BOB", "USD", true)]
    [InlineData("USD", "BOB", false)]
    [InlineData("USD", "BOB", true)]
    public async Task Budgets_ShouldExcludeTransferLegs_AndPreserveExpensesReversalsAndBalances(
        string sourceCurrency, string destinationCurrency, bool categorizeTransfer)
    {
        // Isolate the HTTP rate-limit window as well as the in-memory databases from the shared fixture.
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        async Task<HttpResponseMessage> Send(HttpMethod method, string url, object? body = null)
        {
            using var request = new HttpRequestMessage(method, url);
            request.Headers.Add("X-User-Id", _testUserId.ToString());
            if (body is not null) request.Content = JsonContent.Create(body);
            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return response;
        }

        async Task<Guid> Account(string name, string currency, decimal initialBalance)
        {
            var response = await Send(HttpMethod.Post, "/v1/accounts",
                new CreateAccountRequest(name, AccountType.Bank, currency, initialBalance));
            return (await response.Content.ReadFromJsonAsync<CreatedAccountResponse>())!.Id;
        }

        var categoryResponse = await Send(HttpMethod.Post, "/v1/categories",
            new CreateCategoryRequest("Budget category", TransactionDirection.Expense));
        var categoryId = (await categoryResponse.Content.ReadFromJsonAsync<CategoryDto>())!.Id;
        var expenseAccount = await Account("Expenses", "BOB", 1000m);
        var sourceAccount = await Account("Transfer source", sourceCurrency, 500m);
        var destinationAccount = await Account("Transfer destination", destinationCurrency, 0m);
        await Send(HttpMethod.Post, "/v1/planning/budgets", new CreateBudgetRequest(100m, "BOB", categoryId));
        await Send(HttpMethod.Post, "/v1/planning/budgets", new CreateBudgetRequest(200m, "BOB"));
        var expenseResponse = await Send(HttpMethod.Post, "/v1/transactions",
            new RegisterTransactionRequest(expenseAccount, 60m, TransactionDirection.Expense, categoryId));
        var expenseId = (await expenseResponse.Content.ReadFromJsonAsync<CreatedTransactionResponse>())!.Id;
        await Send(HttpMethod.Post, "/v1/transactions",
            new RegisterTransactionRequest(expenseAccount, 15m, TransactionDirection.Expense));
        await Send(HttpMethod.Post, "/v1/transactions",
            new RegisterTransactionRequest(expenseAccount, 500m, TransactionDirection.Income));
        var destinationAmount = sourceCurrency == destinationCurrency ? 120m : sourceCurrency == "BOB" ? 10m : 1440m;
        if (categorizeTransfer)
        {
            // No category-only transfer API exists. Insert synthetic categorized legs before persistence, never update the ledger.
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
            db.Database.ProviderName.Should().Be("Microsoft.EntityFrameworkCore.Sqlite");
            var legs = Transaction.CreateTransfer(_testUserId, sourceAccount,
                Money.Of(120m, Currency.FromCode(sourceCurrency)), destinationAccount,
                Money.Of(destinationAmount, Currency.FromCode(destinationCurrency)), DateTime.UtcNow,
                appliedRate: 12m, rateSource: "Test", description: "Categorized transfer fixture");
            db.Transactions.AddRange(legs.Outflow, legs.Inflow);
            db.Entry(legs.Outflow).Property(t => t.CategoryId).CurrentValue = categoryId;
            db.Entry(legs.Inflow).Property(t => t.CategoryId).CurrentValue = categoryId;
            await db.SaveChangesAsync();
        }
        else
        {
            await Send(HttpMethod.Post, "/v1/transactions/transfers",
                new RegisterTransferRequest(sourceAccount, 120m, destinationAccount, destinationAmount,
                    AppliedRate: sourceCurrency == destinationCurrency ? null : 12m, RateSource: "Test"));
        }

        async Task AssertMetrics(decimal income, decimal expenseAccountBalance)
        {
            var budgets = (await (await Send(HttpMethod.Get, "/v1/planning/budgets"))
                .Content.ReadFromJsonAsync<List<BudgetDto>>())!;
            budgets.Should().HaveCount(2);
            var categoryBudget = budgets.Single(b => b.CategoryId == categoryId);
            categoryBudget.SpentAmount.Should().Be(60m);
            categoryBudget.RemainingAmount.Should().Be(40m);
            categoryBudget.LimitAmount.Should().Be(100m);
            categoryBudget.Currency.Should().Be("BOB");
            var generalBudget = budgets.Single(b => b.CategoryId is null);
            generalBudget.SpentAmount.Should().Be(75m);
            generalBudget.RemainingAmount.Should().Be(125m);
            generalBudget.LimitAmount.Should().Be(200m);

            var health = (await (await Send(HttpMethod.Get, "/v1/planning/financial-health"))
                .Content.ReadFromJsonAsync<FinancialHealthDto>())!;
            var bobHealth = health.Currencies.Single(currency => currency.Currency == "BOB");
            bobHealth.MonthlyIncome.Should().Be(income);
            bobHealth.MonthlyExpenses.Should().Be(75m);
            bobHealth.CurrentBalance.Should().Be(expenseAccountBalance
                + (sourceCurrency == "BOB" ? 380m : 0m)
                + (destinationCurrency == "BOB" ? destinationAmount : 0m));
            var accounts = (await (await Send(HttpMethod.Get, "/v1/accounts"))
                .Content.ReadFromJsonAsync<List<AccountDto>>())!;
            accounts.Single(a => a.Id == expenseAccount).Balance.Should().Be(expenseAccountBalance);
            accounts.Single(a => a.Id == sourceAccount).Balance.Should().Be(380m);
            accounts.Single(a => a.Id == destinationAccount).Balance.Should().Be(destinationAmount);
        }

        await AssertMetrics(500m, 1425m);
        await Send(HttpMethod.Post, $"/v1/transactions/{expenseId}/reverse", new ReverseTransactionRequest("Correction"));
        // Existing metrics are gross flows: an expense reversal is income, not negative budget spending.
        await AssertMetrics(560m, 1485m);
        var transactions = (await (await Send(HttpMethod.Get, "/v1/transactions?limit=100"))
            .Content.ReadFromJsonAsync<List<TransactionDto>>())!;
        transactions.Should().HaveCount(6);
        transactions.Should().ContainSingle(t => t.ReversesId == expenseId && t.Direction == "Income");
        transactions.Count(t => t.TransferId.HasValue).Should().Be(2);
    }

    [Fact]
    public async Task WhatsAppBot_LinkingAndMovementWorkflow_ShouldWorkEndToEnd()
    {
        // 0. Ensure user has at least one account to impute confirmed movements
        var createAccReq = new CreateAccountRequest("Billetera WhatsApp", AccountType.Wallet, "BOB", 500m);
        using var accMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
        {
            Content = JsonContent.Create(createAccReq)
        };
        accMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        await _client.SendAsync(accMsg);

        // 1. Link WhatsApp number from app
        var linkReq = new LinkWhatsAppRequest("+591 700 11223");
        using var linkMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/messaging/whatsapp/link")
        {
            Content = JsonContent.Create(linkReq)
        };
        linkMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var linkRes = await _client.SendAsync(linkMsg);
        linkRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var linkData = await linkRes.Content.ReadFromJsonAsync<LinkWhatsAppResponse>();
        var code = linkData!.VerificationCode;

        // 2. Incoming message with verification code -> activates link (BOT-01)
        var verifyWebhook = new WhatsAppWebhookRequest("MSG-001", "+59170011223", code);
        using var verifyMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/messaging/whatsapp/webhook")
        {
            Content = JsonContent.Create(verifyWebhook)
        };
        var verifyRes = await _client.SendAsync(verifyMsg);
        verifyRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var verifyResult = await verifyRes.Content.ReadFromJsonAsync<WhatsAppWebhookResponse>();
        verifyResult!.ActionTaken.Should().Be("LinkActivated");

        // 3. User sends "gasto 60 bs en almuerzo" (BOT-03)
        var expenseWebhook = new WhatsAppWebhookRequest("MSG-002", "+59170011223", "Gasto 60 Bs en almuerzo");
        using var expenseMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/messaging/whatsapp/webhook")
        {
            Content = JsonContent.Create(expenseWebhook)
        };
        var expenseRes = await _client.SendAsync(expenseMsg);
        expenseRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var expenseResult = await expenseRes.Content.ReadFromJsonAsync<WhatsAppWebhookResponse>();
        expenseResult!.ActionTaken.Should().Be("DraftCreated");

        // 4. User replies "1" to confirm draft into Ledger (BOT-06)
        var confirmWebhook = new WhatsAppWebhookRequest("MSG-003", "+59170011223", "1");
        using var confirmMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/messaging/whatsapp/webhook")
        {
            Content = JsonContent.Create(confirmWebhook)
        };
        var confirmRes = await _client.SendAsync(confirmMsg);
        confirmRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var confirmResult = await confirmRes.Content.ReadFromJsonAsync<WhatsAppWebhookResponse>();
        confirmResult!.ActionTaken.Should().Be("DraftConfirmed");

        // 5. User asks "Saldo" (BOT-04)
        var saldoWebhook = new WhatsAppWebhookRequest("MSG-004", "+59170011223", "Saldo");
        using var saldoMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/messaging/whatsapp/webhook")
        {
            Content = JsonContent.Create(saldoWebhook)
        };
        var saldoRes = await _client.SendAsync(saldoMsg);
        var saldoResult = await saldoRes.Content.ReadFromJsonAsync<WhatsAppWebhookResponse>();
        saldoResult!.ActionTaken.Should().Be("BalanceQuery");
        saldoResult.ReplyText.Should().Contain("Saldos");

        // 6. User asks "Cotizacion" (BOT-05)
        var rateWebhook = new WhatsAppWebhookRequest("MSG-005", "+59170011223", "Cotización");
        using var rateMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/messaging/whatsapp/webhook")
        {
            Content = JsonContent.Create(rateWebhook)
        };
        var rateRes = await _client.SendAsync(rateMsg);
        var rateResult = await rateRes.Content.ReadFromJsonAsync<WhatsAppWebhookResponse>();
        rateResult!.ActionTaken.Should().Be("RateQuery");
        rateResult.ReplyText.Should().Contain("BOB/USD");
    }

    [Fact]
    public async Task BinanceSync_SecurityGuard_ShouldRejectUnsafeKeys()
    {
        // 1. Unsafe key with trading permissions enabled -> Rejected (Rule 18, ING-14)
        var unsafeReq = new ConnectBinanceKeyRequest("test_key", "test_secret", PermitsTrading: true);
        using var unsafeMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/integrations/binance/connect")
        {
            Content = JsonContent.Create(unsafeReq)
        };
        unsafeMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var unsafeRes = await _client.SendAsync(unsafeMsg);
        unsafeRes.StatusCode.Should().Be(HttpStatusCode.BadRequest, "Trading permissions on Binance keys must be rejected (Rule 18).");

        // 2. Safe read-only key -> Accepted
        var safeReq = new ConnectBinanceKeyRequest("test_key", "test_secret", PermitsTrading: false, PermitsWithdrawals: false);
        using var safeMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/integrations/binance/connect")
        {
            Content = JsonContent.Create(safeReq)
        };
        safeMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var safeRes = await _client.SendAsync(safeMsg);
        safeRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task IncomeDistribution_ShouldPropose503020_AdjustedForDebts()
    {
        var req = new ProposeIncomeDistributionRequest(5000m, "BOB");
        using var msg = new HttpRequestMessage(HttpMethod.Post, "/v1/planning/income-distribution/propose")
        {
            Content = JsonContent.Create(req)
        };
        msg.Headers.Add("X-User-Id", _testUserId.ToString());
        var res = await _client.SendAsync(msg);
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var proposal = await res.Content.ReadFromJsonAsync<IncomeDistributionProposal>();
        proposal.Should().NotBeNull();
        proposal!.TotalIncome.Should().Be(5000m);
        proposal.NeedsAmount.Should().Be(2500m); // 50%
    }

    [Fact]
    public async Task Cors_ShouldAllowConfiguredOriginsAndPreflight()
    {
        // 1. Preflight OPTIONS request
        using var preflight = new HttpRequestMessage(HttpMethod.Options, "/v1/accounts");
        preflight.Headers.Add("Origin", "http://localhost:3000");
        preflight.Headers.Add("Access-Control-Request-Method", "GET");
        preflight.Headers.Add("Access-Control-Request-Headers", "X-User-Id");

        var preflightRes = await _client.SendAsync(preflight);
        preflightRes.StatusCode.Should().Be(HttpStatusCode.NoContent);
        preflightRes.Headers.Contains("Access-Control-Allow-Origin").Should().BeTrue();
        preflightRes.Headers.GetValues("Access-Control-Allow-Origin").First().Should().Be("http://localhost:3000");

        // 2. Standard cross-origin GET request
        using var getMsg = new HttpRequestMessage(HttpMethod.Get, "/v1/accounts");
        getMsg.Headers.Add("Origin", "http://localhost:3000");
        getMsg.Headers.Add("X-User-Id", _testUserId.ToString());

        var getRes = await _client.SendAsync(getMsg);
        getRes.Headers.Contains("Access-Control-Allow-Origin").Should().BeTrue();
        getRes.Headers.GetValues("Access-Control-Allow-Origin").First().Should().Be("http://localhost:3000");
    }

    [Fact]
    public async Task Auth_LoginWithGoogle_ShouldReturnJwtTokenAndUser()
    {
        var email = $"test_{Guid.NewGuid()}@billefy.app";
        var res = await _client.PostAsJsonAsync("/api/v1/auth/google", new GoogleLoginRequest(email, "BOB"));
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var authRes = await res.Content.ReadFromJsonAsync<AuthResponseDto>();
        authRes.Should().NotBeNull();
        authRes!.AccessToken.Should().NotBeNullOrWhiteSpace();
        authRes.RefreshToken.Should().NotBeNullOrWhiteSpace();
        authRes.User.Email.Should().Be(email);
        authRes.User.PreferredCurrency.Should().Be("BOB");

        // Test creating account with Bearer token
        using var createAccWithBearer = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
        {
            Content = JsonContent.Create(new CreateAccountRequest("Banco ganadero", AccountType.Bank, "BOB", 140m))
        };
        createAccWithBearer.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authRes.AccessToken);
        var createAccRes = await _client.SendAsync(createAccWithBearer);
        createAccRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // Refresh token rotation test
        var refreshRes = await _client.PostAsJsonAsync("/api/v1/auth/refresh", new RefreshTokenRequest(authRes.RefreshToken));
        refreshRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var rotatedAuth = await refreshRes.Content.ReadFromJsonAsync<AuthResponseDto>();
        rotatedAuth.Should().NotBeNull();
        rotatedAuth!.AccessToken.Should().NotBeNullOrWhiteSpace();
        rotatedAuth.RefreshToken.Should().NotBe(authRes.RefreshToken);

        // Export data test
        using var exportMsg = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/export");
        exportMsg.Headers.Add("X-User-Id", authRes.User.Id.ToString());
        var exportRes = await _client.SendAsync(exportMsg);
        exportRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var exportData = await exportRes.Content.ReadFromJsonAsync<UserDataExportDto>();
        exportData.Should().NotBeNull();
        exportData!.User.Id.Should().Be(authRes.User.Id);
    }

    [Fact]
    public async Task Notifications_RegisterDevice_And_SendPush_ShouldWork()
    {
        using var regMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/notifications/devices")
        {
            Content = JsonContent.Create(new RegisterDeviceTokenRequest("fcm_token_test_12345", "Android"))
        };
        regMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var regRes = await _client.SendAsync(regMsg);
        regRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var regDto = await regRes.Content.ReadFromJsonAsync<DeviceRegistrationDto>();
        regDto.Should().NotBeNull();
        regDto!.Platform.Should().Be("Android");

        // Send test push
        using var pushMsg = new HttpRequestMessage(HttpMethod.Post, "/api/v1/notifications/test")
        {
            Content = JsonContent.Create(new PushNotificationMessage("Alerta de Prueba", "Cuerpo del mensaje"))
        };
        pushMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var pushRes = await _client.SendAsync(pushMsg);
        pushRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Get notification history
        using var histMsg = new HttpRequestMessage(HttpMethod.Get, "/api/v1/notifications");
        histMsg.Headers.Add("X-User-Id", _testUserId.ToString());
        var histRes = await _client.SendAsync(histMsg);
        histRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var logs = await histRes.Content.ReadFromJsonAsync<List<NotificationLogDto>>();
        logs.Should().NotBeNull();
        logs!.Should().NotBeEmpty();
        logs.First().Title.Should().Be("Alerta de Prueba");
    }

    [Fact]
    public async Task Investments_And_DistributionPlan_ShouldPersistPerUser_AndAccountsKeepVisuals()
    {
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        HttpRequestMessage Req(HttpMethod method, string url, Guid uid, object? body = null)
        {
            var msg = new HttpRequestMessage(method, url);
            if (body is not null) msg.Content = JsonContent.Create(body);
            msg.Headers.Add("X-User-Id", uid.ToString());
            return msg;
        }

        // Account with new type + icon/color persisted server-side
        var accRes = await _client.SendAsync(Req(HttpMethod.Post, "/v1/accounts", userId,
            new CreateAccountRequest("Ahorro BNB", AccountType.Savings, "BOB", 100m, "piggy-bank", "emerald")));
        accRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var accounts = await (await _client.SendAsync(Req(HttpMethod.Get, "/v1/accounts", userId)))
            .Content.ReadFromJsonAsync<List<AccountDto>>();
        accounts.Should().ContainSingle();
        accounts![0].Type.Should().Be("Savings");
        accounts[0].IconKey.Should().Be("piggy-bank");
        accounts[0].ColorKey.Should().Be("emerald");

        // Rename + restyle the account; other users cannot touch it
        var accountId = accounts[0].Id;
        var putRes = await _client.SendAsync(Req(HttpMethod.Put, $"/v1/accounts/{accountId}", userId,
            new UpdateAccountRequest("Ahorro Principal", "shield", "violet")));
        putRes.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var foreignPut = await _client.SendAsync(Req(HttpMethod.Put, $"/v1/accounts/{accountId}", otherUserId,
            new UpdateAccountRequest("Hack", null, null)));
        foreignPut.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var renamed = await (await _client.SendAsync(Req(HttpMethod.Get, "/v1/accounts", userId)))
            .Content.ReadFromJsonAsync<List<AccountDto>>();
        renamed![0].Name.Should().Be("Ahorro Principal");
        renamed[0].IconKey.Should().Be("shield");
        renamed[0].ColorKey.Should().Be("violet");

        // Investment lifecycle with auto-calculated variation
        var createRes = await _client.SendAsync(Req(HttpMethod.Post, "/v1/planning/investments", userId,
            new CreateInvestmentRequest("Bitcoin", "crypto", "coins", "amber", "USD", 0.5m, 1000m)));
        createRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createRes.Content.ReadFromJsonAsync<CreatedAccountResponse>();

        var updateRes = await _client.SendAsync(Req(HttpMethod.Put, $"/v1/planning/investments/{created!.Id}/value", userId,
            new UpdateInvestmentValueRequest(1250m)));
        updateRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateRes.Content.ReadFromJsonAsync<InvestmentDto>();
        updated!.VariationPct.Should().Be(25m);
        updated.History.Should().HaveCount(2);

        var foreign = await _client.SendAsync(Req(HttpMethod.Get, "/v1/planning/investments", otherUserId));
        (await foreign.Content.ReadFromJsonAsync<List<InvestmentDto>>()).Should().BeEmpty();

        var foreignUpdate = await _client.SendAsync(Req(HttpMethod.Put, $"/v1/planning/investments/{created.Id}/value", otherUserId,
            new UpdateInvestmentValueRequest(1m)));
        foreignUpdate.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var delRes = await _client.SendAsync(Req(HttpMethod.Delete, $"/v1/planning/investments/{created.Id}", userId));
        delRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Distribution plan: disabled/empty by default, validated, then persisted
        var defaultPlan = await (await _client.SendAsync(Req(HttpMethod.Get, "/v1/planning/distribution-plan", userId)))
            .Content.ReadFromJsonAsync<DistributionPlanDto>();
        defaultPlan!.Enabled.Should().BeFalse();
        defaultPlan.Buckets.Should().BeEmpty();

        var tooMuch = await _client.SendAsync(Req(HttpMethod.Put, "/v1/planning/distribution-plan", userId,
            new SaveDistributionPlanRequest(true, [
                new PlanBucketDto("a", "Necesidades", 70m, "blue", []),
                new PlanBucketDto("b", "Deseos", 50m, "pink", [])])));
        tooMuch.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var categoryId = await CreateDistributionCategoryAsync(userId);
        var saveRes = await _client.SendAsync(Req(HttpMethod.Put, "/v1/planning/distribution-plan", userId,
            new SaveDistributionPlanRequest(true, [
                new PlanBucketDto("a", "Necesidades", 50m, "blue", [categoryId]),
                new PlanBucketDto("b", "Deseos", 30m, "pink", []),
                new PlanBucketDto("c", "Ahorro", 20m, "emerald", [])])));
        saveRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var reloaded = await (await _client.SendAsync(Req(HttpMethod.Get, "/v1/planning/distribution-plan", userId)))
            .Content.ReadFromJsonAsync<DistributionPlanDto>();
        reloaded!.Enabled.Should().BeTrue();
        reloaded.Buckets.Should().HaveCount(3);
        reloaded.Buckets[0].CategoryIds.Should().ContainSingle(categoryId);
    }

    [Theory]
    [InlineData("empty")]
    [InlineData("single")]
    [InlineData("under")]
    [InlineData("over")]
    [InlineData("near")]
    [InlineData("zero")]
    [InlineData("negative")]
    [InlineData("above100")]
    [InlineData("blank")]
    [InlineData("longName")]
    [InlineData("tooMany")]
    public async Task DistributionPlan_Enabled_InvalidGroups_ShouldReject_AndPreservePlan(string scenario)
    {
        var buckets = DistributionBuckets(50m, 50m);
        switch (scenario)
        {
            case "empty": buckets = []; break;
            case "single": buckets = DistributionBuckets(100m); break;
            case "under": buckets[1] = buckets[1] with { Percent = 49m }; break;
            case "over": buckets[1] = buckets[1] with { Percent = 51m }; break;
            case "near": buckets[1] = buckets[1] with { Percent = 49.9999m }; break;
            case "zero": buckets = DistributionBuckets(100m, 0m); break;
            case "negative": buckets = DistributionBuckets(100m, -1m); break;
            case "above100": buckets = DistributionBuckets(101m, 1m); break;
            case "blank": buckets[0] = buckets[0] with { Name = "  " }; break;
            case "longName": buckets[0] = buckets[0] with { Name = new string('a', 61) }; break;
            case "tooMany": buckets = DistributionBuckets(Enumerable.Repeat(10m, 9).ToArray()); break;
        }

        (await SaveDistributionAsync(false, [])).StatusCode.Should().Be(HttpStatusCode.OK);
        (await SaveDistributionAsync(true, buckets)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var saved = await GetDistributionAsync();
        saved.Enabled.Should().BeFalse();
        saved.Buckets.Should().BeEmpty();
    }

    [Theory]
    [InlineData(2)]
    [InlineData(4)]
    [InlineData(8)]
    public async Task DistributionPlan_CustomGroups_ShouldPersistExactDecimals_AndOwnedExpenseCategory(int count)
    {
        var categoryId = await CreateDistributionCategoryAsync(_testUserId);
        var buckets = DistributionBuckets(count switch
        {
            2 => [33.33m, 66.67m],
            4 => [1.25m, 23.75m, 25m, 50m],
            _ => Enumerable.Repeat(12.5m, 8).ToArray()
        });
        buckets[0] = buckets[0] with { Name = "  Custom allocation  ", CategoryIds = [categoryId] };

        (await SaveDistributionAsync(true, buckets)).StatusCode.Should().Be(HttpStatusCode.OK);
        var saved = await GetDistributionAsync();
        saved.Enabled.Should().BeTrue();
        saved.Buckets.Should().BeEquivalentTo(buckets.Select(b => b with { Name = b.Name.Trim() }),
            options => options.WithStrictOrdering());
    }

    [Theory]
    [InlineData("within", true)]
    [InlineData("across", true)]
    [InlineData("case", true)]
    [InlineData("malformed", true)]
    [InlineData("unknown", true)]
    [InlineData("foreign", true)]
    [InlineData("income", true)]
    [InlineData("within", false)]
    [InlineData("across", false)]
    [InlineData("case", false)]
    [InlineData("malformed", false)]
    [InlineData("unknown", false)]
    [InlineData("foreign", false)]
    [InlineData("income", false)]
    public async Task DistributionPlan_InvalidCategoryReferences_ShouldReject(string scenario, bool enabled)
    {
        var categoryId = await CreateDistributionCategoryAsync(_testUserId);
        var buckets = DistributionBuckets(50m, 50m);
        buckets[0] = buckets[0] with { CategoryIds = [categoryId] };
        switch (scenario)
        {
            case "within": buckets[0].CategoryIds.Add(categoryId); break;
            case "across": buckets[1].CategoryIds.Add(categoryId); break;
            case "case": buckets[1].CategoryIds.Add(Guid.Parse(categoryId).ToString("B").ToUpperInvariant()); break;
            case "malformed": buckets[0].CategoryIds[0] = "cat-1"; break;
            case "unknown": buckets[0].CategoryIds[0] = Guid.NewGuid().ToString(); break;
            case "foreign": buckets[0].CategoryIds[0] = await CreateDistributionCategoryAsync(Guid.NewGuid()); break;
            case "income": buckets[0].CategoryIds[0] = await CreateDistributionCategoryAsync(_testUserId, TransactionDirection.Income); break;
        }

        (await SaveDistributionAsync(false, [])).StatusCode.Should().Be(HttpStatusCode.OK);
        (await SaveDistributionAsync(enabled, buckets)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await GetDistributionAsync()).Buckets.Should().BeEmpty();
    }

    [Theory]
    [InlineData("empty")]
    [InlineData("single")]
    [InlineData("zero")]
    [InlineData("under")]
    public async Task DistributionPlan_DisabledDraft_ShouldPersist_AndRemainEditable(string scenario)
    {
        var buckets = scenario switch
        {
            "empty" => new List<PlanBucketDto>(),
            "single" => DistributionBuckets(40m),
            "zero" => DistributionBuckets(100m, 0m),
            _ => DistributionBuckets(20m, 30m)
        };
        (await SaveDistributionAsync(false, buckets)).StatusCode.Should().Be(HttpStatusCode.OK);
        var draft = await GetDistributionAsync();
        draft.Enabled.Should().BeFalse();
        draft.Buckets.Should().BeEquivalentTo(buckets, options => options.WithStrictOrdering());
        (await SaveDistributionAsync(true, buckets)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await GetDistributionAsync()).Buckets.Should().BeEquivalentTo(buckets);
        (await SaveDistributionAsync(true, DistributionBuckets(60m, 40m))).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData("cat-1")]
    [InlineData("00000000-0000-0000-0000-000000000001")]
    public async Task DistributionPlan_LegacyIncompletePlan_ShouldDisableWithoutDeleting_ThenRequireValidEdits(string categoryId)
    {
        var buckets = DistributionBuckets(40m);
        buckets[0].CategoryIds.Add(categoryId);
        var json = JsonSerializer.Serialize(buckets);
        var legacy = DistributionPlan.Create(_testUserId, true, json, DateTime.UtcNow);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PlanningDbContext>();
            db.Database.ProviderName.Should().Be("Microsoft.EntityFrameworkCore.Sqlite");
            db.DistributionPlans.Add(legacy);
            await db.SaveChangesAsync();
        }

        var existing = await GetDistributionAsync();
        existing.Enabled.Should().BeTrue();
        existing.Buckets.Should().BeEquivalentTo(buckets);
        (await SaveDistributionAsync(false, existing.Buckets)).StatusCode.Should().Be(HttpStatusCode.OK);
        // Repeated saves remain safe, but editing cannot introduce or retain invalid references.
        (await SaveDistributionAsync(false, existing.Buckets)).StatusCode.Should().Be(HttpStatusCode.OK);
        var disabled = await GetDistributionAsync();
        disabled.Enabled.Should().BeFalse();
        disabled.Buckets.Should().BeEquivalentTo(buckets);
        (await SaveDistributionAsync(true, buckets)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await SaveDistributionAsync(false, [buckets[0] with { Name = "Changed" }]))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PlanningDbContext>();
            var preserved = await db.DistributionPlans.IgnoreQueryFilters().SingleAsync(p => p.UserId == _testUserId);
            preserved.Id.Should().Be(legacy.Id);
            preserved.BucketsJson.Should().Be(json);
            preserved.IsEnabled.Should().BeFalse();
        }
        (await SaveDistributionAsync(true, DistributionBuckets(60m, 40m))).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DistributionPlan_OmittedTrackingMode_ShouldDefaultToExpenses_WithoutNameInference(bool enabled)
    {
        var categoryId = await CreateDistributionCategoryAsync(_testUserId);
        var buckets = new[]
        {
            new { id = "a", name = "Ahorro", percent = 50m, colorKey = "blue", categoryIds = new[] { categoryId } },
            new { id = "b", name = "Investment", percent = 50m, colorKey = "green", categoryIds = Array.Empty<string>() }
        };
        var response = await SaveDistributionJsonAsync(enabled, buckets);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        saved.GetProperty("buckets").EnumerateArray().Should().OnlyContain(
            b => b.GetProperty("trackingMode").GetString() == "Expenses");
        (await GetDistributionAsync()).Buckets[0].CategoryIds.Should().ContainSingle(categoryId);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DistributionPlan_ExplicitTrackingModes_ShouldRoundTrip_AndPersist(bool enabled)
    {
        var categoryId = await CreateDistributionCategoryAsync(_testUserId);
        var buckets = new[]
        {
            new { id = "a", name = "Savings", percent = 60m, colorKey = "blue", categoryIds = new[] { categoryId }, trackingMode = "Expenses" },
            new { id = "b", name = "Custom target", percent = 40m, colorKey = "green", categoryIds = Array.Empty<string>(), trackingMode = "TargetOnly" }
        };
        var response = await SaveDistributionJsonAsync(enabled, buckets);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        saved.GetProperty("buckets")[0].GetProperty("trackingMode").GetString().Should().Be("Expenses");
        saved.GetProperty("buckets")[1].GetProperty("trackingMode").GetString().Should().Be("TargetOnly");

        using var get = new HttpRequestMessage(HttpMethod.Get, "/v1/planning/distribution-plan");
        get.Headers.Add("X-User-Id", _testUserId.ToString());
        var reloadResponse = await _client.SendAsync(get);
        reloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var reloaded = await reloadResponse.Content.ReadFromJsonAsync<JsonElement>();
        reloaded.GetRawText().Should().Be(saved.GetRawText());
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PlanningDbContext>();
        db.Database.ProviderName.Should().Be("Microsoft.EntityFrameworkCore.Sqlite");
        var plan = await db.DistributionPlans.IgnoreQueryFilters().SingleAsync(p => p.UserId == _testUserId);
        var stored = JsonSerializer.Deserialize<JsonElement>(plan.BucketsJson);
        stored[0].GetProperty("TrackingMode").GetString().Should().Be("Expenses");
        stored[1].GetProperty("TrackingMode").GetString().Should().Be("TargetOnly");
    }

    [Theory]
    [InlineData("Unknown", true)]
    [InlineData("Unknown", false)]
    [InlineData("expenses", true)]
    [InlineData("expenses", false)]
    [InlineData("", true)]
    [InlineData("", false)]
    [InlineData(null, true)]
    [InlineData(null, false)]
    public async Task DistributionPlan_InvalidTrackingMode_ShouldReject_AndPreservePlan(string? mode, bool enabled)
    {
        (await SaveDistributionAsync(true, DistributionBuckets(60m, 40m))).StatusCode.Should().Be(HttpStatusCode.OK);
        var before = await GetDistributionAsync();
        var response = await SaveDistributionJsonAsync(enabled, new[]
        {
            new { id = "a", name = "Group A", percent = 60m, colorKey = "blue", categoryIds = Array.Empty<string>(), trackingMode = mode },
            new { id = "b", name = "Group B", percent = 40m, colorKey = "green", categoryIds = Array.Empty<string>(), trackingMode = (string?)"Expenses" }
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("Plan.InvalidTrackingMode");
        (await GetDistributionAsync()).Should().BeEquivalentTo(before);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DistributionPlan_TargetOnlyWithExpenseCategory_ShouldReject_AndPreservePlan(bool enabled)
    {
        var categoryId = await CreateDistributionCategoryAsync(_testUserId);
        (await SaveDistributionAsync(false, [])).StatusCode.Should().Be(HttpStatusCode.OK);
        var response = await SaveDistributionJsonAsync(enabled, new[]
        {
            new { id = "a", name = "Target", percent = 60m, colorKey = "blue", categoryIds = new[] { categoryId }, trackingMode = "TargetOnly" },
            new { id = "b", name = "Expenses", percent = 40m, colorKey = "green", categoryIds = Array.Empty<string>(), trackingMode = "Expenses" }
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("Plan.TargetOnlyCategories");
        (await GetDistributionAsync()).Buckets.Should().BeEmpty();
    }

    [Fact]
    public async Task DistributionPlan_LegacyOmittedTrackingMode_ShouldDisableWithoutRewritingJson()
    {
        const string json = """
            [ { "Id": "old", "Name": "Ahorro", "Percent": 40, "ColorKey": "blue", "CategoryIds": ["stale-category"] } ]
            """;
        var legacy = DistributionPlan.Create(_testUserId, true, json, DateTime.UtcNow);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PlanningDbContext>();
            db.Database.ProviderName.Should().Be("Microsoft.EntityFrameworkCore.Sqlite");
            db.DistributionPlans.Add(legacy);
            await db.SaveChangesAsync();
        }
        var existing = await GetDistributionAsync();
        existing.Enabled.Should().BeTrue();
        existing.Buckets.Should().ContainSingle();
        existing.Buckets[0].TrackingMode.Should().Be("Expenses");
        // A legacy client omits the field; a current client sends the default explicitly.
        var omitted = JsonSerializer.Deserialize<JsonElement>(json);
        (await SaveDistributionJsonAsync(false, omitted)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await SaveDistributionAsync(false, existing.Buckets)).StatusCode.Should().Be(HttpStatusCode.OK);
        using var checkScope = _factory.Services.CreateScope();
        var checkDb = checkScope.ServiceProvider.GetRequiredService<PlanningDbContext>();
        var preserved = await checkDb.DistributionPlans.IgnoreQueryFilters().SingleAsync(p => p.UserId == _testUserId);
        preserved.Id.Should().Be(legacy.Id);
        preserved.IsEnabled.Should().BeFalse();
        preserved.BucketsJson.Should().Be(json);
        (await SaveDistributionAsync(true, existing.Buckets)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await SaveDistributionAsync(false, [existing.Buckets[0] with { Name = "Changed" }]))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private async Task<HttpResponseMessage> SaveDistributionJsonAsync(bool enabled, object buckets)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, "/v1/planning/distribution-plan")
        {
            Content = JsonContent.Create(new { enabled, buckets })
        };
        request.Headers.Add("X-User-Id", _testUserId.ToString());
        return await _client.SendAsync(request);
    }

    [Theory]
    [InlineData("x|y", "blue")]
    [InlineData("coins", "blue|rose")]
    [InlineData("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "blue")]
    [InlineData("coins", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")]
    public async Task Categories_IncomeMetadata_ShouldRetainDirection_AndRejectDistributionAssignment(string icon, string color)
    {
        var categoryId = await CreateDistributionCategoryAsync(_testUserId, TransactionDirection.Income, icon, color);
        var buckets = DistributionBuckets(50m, 50m);
        buckets[0].CategoryIds.Add(categoryId);
        (await SaveDistributionAsync(true, buckets)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await SaveDistributionAsync(false, buckets)).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        foreach (var direction in new[] { "Expense", "Income" })
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"/v1/categories?direction={direction}");
            request.Headers.Add("X-User-Id", _testUserId.ToString());
            var response = await _client.SendAsync(request);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var categories = await response.Content.ReadFromJsonAsync<List<CategoryDto>>();
            if (direction == "Income")
                categories.Should().ContainSingle(c => c.Id == Guid.Parse(categoryId) && c.Direction == "Income");
            else
                categories.Should().BeEmpty();
        }

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
        var stored = await db.Categories.IgnoreQueryFilters().SingleAsync(c => c.Id == Guid.Parse(categoryId));
        var metadata = $"Income|{icon}|{color}";
        stored.Icon.Should().Be(metadata.Length <= 50 ? metadata : metadata[..50]);
    }

    [Theory]
    [InlineData("utensils")]
    [InlineData("Income")]
    [InlineData("legacy|icon|color")]
    [InlineData("1|icon|color")]
    [InlineData("income|icon|color")]
    [InlineData("|Income|icon|color")]
    public async Task Categories_LegacyIconsWithoutCanonicalPrefix_ShouldRemainExpense(string icon)
    {
        var category = Ledger.Domain.Categories.Category.Create(_testUserId, "Legacy category", null, icon, DateTime.UtcNow);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
            db.Database.ProviderName.Should().Be("Microsoft.EntityFrameworkCore.Sqlite");
            db.Categories.Add(category);
            await db.SaveChangesAsync();
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "/v1/categories?direction=Expense");
        request.Headers.Add("X-User-Id", _testUserId.ToString());
        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var categories = await response.Content.ReadFromJsonAsync<List<CategoryDto>>();
        categories.Should().ContainSingle(c => c.Id == category.Id && c.Direction == "Expense"
            && c.IconKey == icon && c.ColorKey == "blue");
        var buckets = DistributionBuckets(50m, 50m);
        buckets[0].CategoryIds.Add(category.Id.ToString());
        (await SaveDistributionAsync(true, buckets)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private static List<PlanBucketDto> DistributionBuckets(params decimal[] percentages) =>
        percentages.Select((percent, index) => new PlanBucketDto(
            $"group-{index}", $"Custom group {index}", percent, "blue", [])).ToList();

    private async Task<string> CreateDistributionCategoryAsync(Guid userId,
        TransactionDirection direction = TransactionDirection.Expense, string? iconKey = null, string? colorKey = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/categories")
        {
            Content = JsonContent.Create(new CreateCategoryRequest("Plan category", direction, iconKey, colorKey))
        };
        request.Headers.Add("X-User-Id", userId.ToString());
        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<CategoryDto>())!.Id.ToString();
    }

    private async Task<HttpResponseMessage> SaveDistributionAsync(bool enabled, List<PlanBucketDto> buckets)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, "/v1/planning/distribution-plan")
        {
            Content = JsonContent.Create(new SaveDistributionPlanRequest(enabled, buckets))
        };
        request.Headers.Add("X-User-Id", _testUserId.ToString());
        return await _client.SendAsync(request);
    }

    private async Task<DistributionPlanDto> GetDistributionAsync()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/v1/planning/distribution-plan");
        request.Headers.Add("X-User-Id", _testUserId.ToString());
        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<DistributionPlanDto>())!;
    }

    [Fact]
    public async Task Categories_ShouldStartEmpty_AndSupportExpenseAndIncomeCreation_WithTransactionAssignment()
    {
        var userId = Guid.NewGuid();

        // 1. Initially 0 categories for a user (no default categories)
        using var initialGet = new HttpRequestMessage(HttpMethod.Get, "/v1/categories");
        initialGet.Headers.Add("X-User-Id", userId.ToString());
        var initialRes = await _client.SendAsync(initialGet);
        initialRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialCategories = await initialRes.Content.ReadFromJsonAsync<List<CategoryDto>>();
        initialCategories.Should().BeEmpty();

        // 2. Create an Expense category
        using var createExpMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/categories")
        {
            Content = JsonContent.Create(new CreateCategoryRequest("Supermercado", TransactionDirection.Expense, "utensils", "rose"))
        };
        createExpMsg.Headers.Add("X-User-Id", userId.ToString());
        var createExpRes = await _client.SendAsync(createExpMsg);
        createExpRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var expCat = await createExpRes.Content.ReadFromJsonAsync<CategoryDto>();
        expCat.Should().NotBeNull();
        expCat!.Name.Should().Be("Supermercado");
        expCat.Direction.Should().Be("Expense");
        expCat.IconKey.Should().Be("utensils");
        expCat.ColorKey.Should().Be("rose");

        // 3. Create an Income category
        using var createIncMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/categories")
        {
            Content = JsonContent.Create(new CreateCategoryRequest("Sueldo", TransactionDirection.Income, "briefcase", "emerald"))
        };
        createIncMsg.Headers.Add("X-User-Id", userId.ToString());
        var createIncRes = await _client.SendAsync(createIncMsg);
        createIncRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var incCat = await createIncRes.Content.ReadFromJsonAsync<CategoryDto>();
        incCat.Should().NotBeNull();
        incCat!.Direction.Should().Be("Income");

        // 4. Filter by Direction
        using var getExpOnly = new HttpRequestMessage(HttpMethod.Get, "/v1/categories?direction=Expense");
        getExpOnly.Headers.Add("X-User-Id", userId.ToString());
        var expOnlyRes = await _client.SendAsync(getExpOnly);
        var expOnlyList = await expOnlyRes.Content.ReadFromJsonAsync<List<CategoryDto>>();
        expOnlyList.Should().ContainSingle(c => c.Id == expCat.Id);

        // 5. Register a transaction assigned to the newly created category Guid
        using var createAccMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
        {
            Content = JsonContent.Create(new CreateAccountRequest("Cuenta Principal", AccountType.Bank, "BOB", 1000m))
        };
        createAccMsg.Headers.Add("X-User-Id", userId.ToString());
        var createAccRes = await _client.SendAsync(createAccMsg);
        var createdAcc = await createAccRes.Content.ReadFromJsonAsync<CreatedAccountResponse>();

        using var regTxnMsg = new HttpRequestMessage(HttpMethod.Post, "/v1/transactions")
        {
            Content = JsonContent.Create(new RegisterTransactionRequest(
                createdAcc!.Id,
                150m,
                TransactionDirection.Expense,
                CategoryId: expCat.Id,
                Description: "Compra semanal"))
        };
        regTxnMsg.Headers.Add("X-User-Id", userId.ToString());
        var regTxnRes = await _client.SendAsync(regTxnMsg);
        regTxnRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdTxn = await regTxnRes.Content.ReadFromJsonAsync<CreatedTransactionResponse>();

        using var getTxnsMsg = new HttpRequestMessage(HttpMethod.Get, "/v1/transactions");
        getTxnsMsg.Headers.Add("X-User-Id", userId.ToString());
        var getTxnsRes = await _client.SendAsync(getTxnsMsg);
        var txns = await getTxnsRes.Content.ReadFromJsonAsync<List<TransactionDto>>();
        txns.Should().ContainSingle(t => t.CategoryId == expCat.Id && t.Description == "Compra semanal");

        // 6. Update the transaction (title + detailed description, amount, occurredAt)
        var customDate = new DateTime(2026, 5, 10, 14, 30, 0, DateTimeKind.Utc);
        using var updateTxnMsg = new HttpRequestMessage(HttpMethod.Put, $"/v1/transactions/{createdTxn!.Id}")
        {
            Content = JsonContent.Create(new UpdateTransactionRequest(
                createdAcc.Id,
                220m,
                TransactionDirection.Expense,
                CategoryId: expCat.Id,
                Description: "Compra mensual\nIncluye productos de limpieza",
                OccurredAt: customDate))
        };
        updateTxnMsg.Headers.Add("X-User-Id", userId.ToString());
        var updateTxnRes = await _client.SendAsync(updateTxnMsg);
        updateTxnRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedTxn = await updateTxnRes.Content.ReadFromJsonAsync<CreatedTransactionResponse>();
        updatedTxn.Should().NotBeNull();

        // Verify account balance reflects the updated amount (1000 - 220 = 780)
        using var checkAccMsg = new HttpRequestMessage(HttpMethod.Get, "/v1/accounts");
        checkAccMsg.Headers.Add("X-User-Id", userId.ToString());
        var checkAccRes = await _client.SendAsync(checkAccMsg);
        var accListAfterEdit = await checkAccRes.Content.ReadFromJsonAsync<List<AccountDto>>();
        accListAfterEdit!.Should().ContainSingle(a => a.Id == createdAcc.Id && a.Balance == 780m);

        // 7. Delete the updated transaction and verify balance returns to 1000
        using var delTxnMsg = new HttpRequestMessage(HttpMethod.Delete, $"/v1/transactions/{updatedTxn!.Id}");
        delTxnMsg.Headers.Add("X-User-Id", userId.ToString());
        var delTxnRes = await _client.SendAsync(delTxnMsg);
        delTxnRes.StatusCode.Should().Be(HttpStatusCode.OK);

        using var checkAccAfterDelMsg = new HttpRequestMessage(HttpMethod.Get, "/v1/accounts");
        checkAccAfterDelMsg.Headers.Add("X-User-Id", userId.ToString());
        var checkAccAfterDelRes = await _client.SendAsync(checkAccAfterDelMsg);
        var accListAfterDel = await checkAccAfterDelRes.Content.ReadFromJsonAsync<List<AccountDto>>();
        accListAfterDel!.Should().ContainSingle(a => a.Id == createdAcc.Id && a.Balance == 1000m);
    }

    [Fact]
    public async Task Swagger_And_OpenApi_ShouldBeAccessible()
    {
        var openApiRes = await _client.GetAsync("/openapi/v1.json");
        openApiRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var openApiContent = await openApiRes.Content.ReadAsStringAsync();
        openApiContent.Should().Contain("Billefy API");

        var swaggerUiRes = await _client.GetAsync("/swagger/index.html");
        swaggerUiRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var healthRes = await _client.GetAsync("/health");
        healthRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private sealed record CreatedAccountResponse(Guid Id);
    private sealed record CreatedTransactionResponse(Guid Id);
    private sealed record CreatedLoanResponse(Guid Id);
}
