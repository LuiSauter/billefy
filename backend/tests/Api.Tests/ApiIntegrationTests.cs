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
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Api.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _ledgerConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _fxConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _ingestionConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _lendingConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _planningConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _messagingConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _identityConnection = new("DataSource=:memory:");
    private readonly SqliteConnection _notificationsConnection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _ledgerConnection.Open();
        _fxConnection.Open();
        _ingestionConnection.Open();
        _lendingConnection.Open();
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
            services.AddDbContext<LendingDbContext>(options => options.UseSqlite(_lendingConnection));
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
            lendingDb.Database.EnsureCreated();

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
        _lendingConnection.Dispose();
        _planningConnection.Dispose();
        _messagingConnection.Dispose();
        _identityConnection.Dispose();
        _notificationsConnection.Dispose();
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

        // 3. Create a savings goal
        var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(5));
        var createGoalReq = new CreateGoalRequest(
            Name: "Fondo de Emergencia",
            TargetAmount: 3000m,
            Currency: "BOB",
            TargetDate: targetDate);

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
        health!.Split503020.Should().NotBeNull();
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
