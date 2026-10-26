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

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _ledgerConnection.Open();
        _fxConnection.Open();
        _ingestionConnection.Open();
        _lendingConnection.Open();

        // Clear connection string so Npgsql is not registered by default
        builder.UseSetting("ConnectionStrings:PostgreSQL", string.Empty);

        builder.ConfigureServices(services =>
        {
            // Register SQLite in-memory DbContexts
            services.AddDbContext<LedgerDbContext>(options => options.UseSqlite(_ledgerConnection));
            services.AddDbContext<FxDbContext>(options => options.UseSqlite(_fxConnection));
            services.AddDbContext<IngestionDbContext>(options => options.UseSqlite(_ingestionConnection));
            services.AddDbContext<LendingDbContext>(options => options.UseSqlite(_lendingConnection));

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
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _ledgerConnection.Dispose();
        _fxConnection.Dispose();
        _ingestionConnection.Dispose();
        _lendingConnection.Dispose();
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

    private sealed record CreatedAccountResponse(Guid Id);
    private sealed record CreatedTransactionResponse(Guid Id);
    private sealed record CreatedLoanResponse(Guid Id);
}
