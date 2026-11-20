using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BuildingBlocks.Currencies;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Lending.Contracts;
using Lending.Domain.Entities;
using Lending.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Api.Tests;

public sealed class LoanQuoteApiTests : IDisposable
{
    private readonly CustomWebApplicationFactory factory = new(configureServices: services =>
        services.Replace(ServiceDescriptor.Singleton<IClock>(new QuoteClock())));
    private readonly HttpClient client;
    private readonly Guid userId = Guid.NewGuid();

    public LoanQuoteApiTests() => client = factory.CreateClient();

    [Fact]
    public async Task LoanQuote_DefaultDate_ReturnsDatedPayoffAndOldestInstallmentSuggestion()
    {
        var id = await CreateLoan(LoanRequest() with { Template = "SimpleOnBalance", InterestRate = 0.1m, LateRate = 0.03m });
        using var response = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var quote = await Body(response);
        quote.GetProperty("loanId").GetGuid().Should().Be(id);
        quote.GetProperty("currency").GetString().Should().Be("USD");
        quote.GetProperty("asOfDate").GetString().Should().Be("2026-11-11");
        quote.GetProperty("totalPayoff").GetDecimal().Should().Be(361m);
        quote.GetProperty("suggestedAmount").GetDecimal().Should().Be(131m);
        quote.GetProperty("remainingPrincipal").GetDecimal().Should().Be(300m);
        quote.GetProperty("installments")[0].GetProperty("dueDate").GetString().Should().Be("2026-11-01");
        quote.GetProperty("installments")[0].GetProperty("outstandingLateInterest").GetDecimal().Should().Be(1m);
        quote.GetProperty("installments")[0].GetProperty("totalOutstanding").GetDecimal().Should().Be(131m);
        quote.GetProperty("proposedAllocations").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task LoanQuote_Amount_PreviewsSameAllocationsAsCommitWithoutWriting()
    {
        var id = await CreateLoan(LoanRequest() with { Template = "SimpleOnBalance", InterestRate = 0.1m, LateRate = 0.03m });
        using var response = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?amount=100");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var quote = await Body(response);
        var allocation = quote.GetProperty("proposedAllocations")[0];
        allocation.GetProperty("toLateInterest").GetDecimal().Should().Be(1m);
        allocation.GetProperty("toInterest").GetDecimal().Should().Be(30m);
        allocation.GetProperty("toPrincipal").GetDecimal().Should().Be(69m);
        quote.GetProperty("resultingPrincipal").GetDecimal().Should().Be(231m);
        quote.GetProperty("resultingState").GetString().Should().Be("InArrears");
        using (var scope = factory.Services.CreateScope())
            (await scope.ServiceProvider.GetRequiredService<LendingDbContext>().Payments.IgnoreQueryFilters().CountAsync()).Should().Be(0);

        using var payment = await Pay(id, 100m, "2026-11-11");
        payment.StatusCode.Should().Be(HttpStatusCode.OK);
        var committed = await Body(payment);
        committed.GetProperty("remainingPrincipal").GetDecimal().Should().Be(231m);
        committed.GetProperty("allocations")[0].ToString().Should().Be(allocation.ToString());
    }

    [Theory]
    [InlineData("0", "Payment.InvalidAmount")]
    [InlineData("-1", "Payment.InvalidAmount")]
    [InlineData("1.0000001", "Payment.InvalidPrecision")]
    [InlineData("100000000000000", "Payment.InvalidPrecision")]
    [InlineData("300.01", "Payment.InvalidOperation")]
    public async Task LoanQuote_InvalidAmount_ReturnsValidationWithoutWrites(string amount, string error)
    {
        var id = await CreateLoan();
        using var response = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?amount={amount}");
        await AssertError(response, HttpStatusCode.BadRequest, error);
        using var scope = factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<LendingDbContext>().Payments.IgnoreQueryFilters().CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task LoanQuote_ExactPayoff_ClosesPreviewAndSixDecimalAmountIsAccepted()
    {
        var id = await CreateLoan();
        using var exact = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?amount=300");
        exact.StatusCode.Should().Be(HttpStatusCode.OK);
        var quote = await Body(exact);
        quote.GetProperty("resultingPrincipal").GetDecimal().Should().Be(0m);
        quote.GetProperty("resultingState").GetString().Should().Be("Paid");
        using var precise = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?amount=1.123456");
        precise.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Body(precise)).GetProperty("resultingPrincipal").GetDecimal().Should().Be(298.876544m);
    }

    [Fact]
    public async Task LoanQuote_BeforeLastPaymentRejected_SameDayAllowed_DefaultTodayIsNotClamped()
    {
        var id = await CreateLoan();
        using var payment = await Pay(id, 50m, "2026-11-12");
        payment.StatusCode.Should().Be(HttpStatusCode.OK);
        using var earlier = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?paymentDate=2026-11-10");
        await AssertError(earlier, HttpStatusCode.BadRequest, "Payment.InvalidDate");
        using var sameDay = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?paymentDate=2026-11-12");
        sameDay.StatusCode.Should().Be(HttpStatusCode.OK);
        using var defaultDate = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote");
        await AssertError(defaultDate, HttpStatusCode.BadRequest, "Payment.InvalidOperation");
    }

    [Fact]
    public async Task LoanQuote_RequiresAuthenticationAndOwnership_UnknownLoanIsNotFound()
    {
        var id = await CreateLoan();
        using var anonymous = await client.GetAsync($"/v1/loans/{id}/quote");
        anonymous.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var other = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote", owner: Guid.NewGuid());
        await AssertError(other, HttpStatusCode.NotFound, "Loan.NotFound");
        using var missing = await Send(HttpMethod.Get, $"/v1/loans/{Guid.NewGuid()}/quote");
        await AssertError(missing, HttpStatusCode.NotFound, "Loan.NotFound");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LoanQuote_CancelledOrPaidLoan_RejectsPreview(bool paid)
    {
        var id = await CreateLoan();
        using var transition = paid ? await Pay(id, 300m, "2026-11-11") : await Send(HttpMethod.Post, $"/v1/loans/{id}/cancel");
        transition.StatusCode.Should().Be(HttpStatusCode.OK);
        using var response = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote");
        await AssertError(response, HttpStatusCode.BadRequest, "Payment.InvalidOperation");
    }

    [Theory]
    [InlineData("/v1/loans")]
    [InlineData("/v1/loans/simulate")]
    public async Task LoanQuote_PolicyContracts_RejectIncompatibleCreationAndSimulation(string endpoint)
    {
        using var response = await Send(HttpMethod.Post, endpoint, new
        {
            counterpartyName = "Synthetic quote counterparty",
            type = "Lent",
            template = "InterestOnly",
            principal = 300m,
            currency = "USD",
            interestRate = 0.1m,
            rate = 0.1m,
            earlyPaymentPolicy = "ReduceTerm"
        });
        await AssertError(response, HttpStatusCode.BadRequest, "Loan.IncompatiblePolicy");
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LendingDbContext>();
        (await db.Loans.IgnoreQueryFilters().CountAsync()).Should().Be(0);
        (await db.Counterparties.IgnoreQueryFilters().CountAsync()).Should().Be(0);
    }

    [Theory]
    [InlineData("/v1/loans", "unknown", null, "Loan.InvalidEarlyPaymentPolicy")]
    [InlineData("/v1/loans/simulate", "999", null, "Loan.InvalidEarlyPaymentPolicy")]
    [InlineData("/v1/loans", null, "unknown", "Loan.InvalidAllocationOrder")]
    [InlineData("/v1/loans/simulate", null, "999", "Loan.InvalidAllocationOrder")]
    public async Task LoanQuote_UnknownPolicyOrOrder_IsRejected(string endpoint, string? policy, string? order, string error)
    {
        using var response = await Send(HttpMethod.Post, endpoint, LoanRequest() with { EarlyPaymentPolicy = policy, AllocationOrder = order });
        await AssertError(response, HttpStatusCode.BadRequest, error);
    }

    [Fact]
    public async Task LoanQuote_CompatibleSimulationAndCreation_AcceptCaseInsensitivePolicyAndOrder()
    {
        var request = LoanRequest() with { EarlyPaymentPolicy = "reduceinstallment", AllocationOrder = "interestprincipallateinterest" };
        using var simulated = await client.PostAsJsonAsync("/v1/loans/simulate", new SimulateLoanRequest(
            300m, 0m, Template: "NoInterest", TotalInstallments: 3, DisbursementDate: request.DisbursementDate,
            EarlyPaymentPolicy: request.EarlyPaymentPolicy, AllocationOrder: request.AllocationOrder));
        simulated.StatusCode.Should().Be(HttpStatusCode.OK);
        var schedule = (await simulated.Content.ReadFromJsonAsync<LoanScheduleDto>())!;
        schedule.TotalToPay.Should().Be(300m);
        var id = await CreateLoan(request);
        using var detailResponse = await Send(HttpMethod.Get, $"/v1/loans/{id}");
        var detail = (await detailResponse.Content.ReadFromJsonAsync<LoanDetailDto>())!;
        detail.Summary.EarlyPaymentPolicy.Should().Be("ReduceInstallment");
        detail.Summary.AllocationOrder.Should().Be("InterestPrincipalLateInterest");
        detail.Installments.Select(i => i.ExpectedTotal).Should().Equal(schedule.Installments.Select(i => i.Total));
    }

    [Fact]
    public async Task LoanQuote_StalePreview_DoesNotAuthorizeAnExcessCommit()
    {
        var id = await CreateLoan();
        using var quote = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?amount=300");
        quote.StatusCode.Should().Be(HttpStatusCode.OK);
        using var intervening = await Pay(id, 50m, "2026-11-11");
        intervening.StatusCode.Should().Be(HttpStatusCode.OK);
        using var staleCommit = await Pay(id, 300m, "2026-11-11");
        await AssertError(staleCommit, HttpStatusCode.BadRequest, "Payment.InvalidOperation");
        using var refreshed = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote");
        (await Body(refreshed)).GetProperty("totalPayoff").GetDecimal().Should().Be(250m);
        using var scope = factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<LendingDbContext>().Payments.IgnoreQueryFilters().CountAsync()).Should().Be(1);
    }

    [Theory]
    [InlineData("Lent", "ReduceInstallment")]
    [InlineData("Borrowed", "ReduceTerm")]
    public async Task LoanQuote_ReductionPolicy_ExposesEarlyPrincipalProjectionAndImmutableMetadata(string type, string policy)
    {
        using var created = await Send(HttpMethod.Post, "/v1/loans", new
        {
            counterpartyName = "Synthetic quote counterparty",
            type,
            template = "NoInterest",
            principal = 300m,
            currency = "USD",
            interestRate = 0m,
            totalInstallments = 3,
            disbursementDate = "2026-10-01",
            earlyPaymentPolicy = policy,
            allocationOrder = "InterestPrincipalLateInterest"
        });
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = (await Body(created)).GetProperty("id").GetGuid();
        using var response = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?paymentDate=2026-10-15&amount=100");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var quote = await Body(response);
        quote.GetProperty("earlyPaymentPolicy").GetString().Should().Be(policy);
        quote.GetProperty("proposedAllocations").GetArrayLength().Should().Be(0);
        quote.GetProperty("proposedEarlyPrincipalAmount").GetDecimal().Should().Be(100m);
        quote.GetProperty("proposedEarlyPrincipalEffectiveDate").GetString().Should().Be("2026-11-01");
        quote.GetProperty("resultingPrincipal").GetDecimal().Should().Be(200m);
        quote.GetProperty("projectedInstallments").EnumerateArray().Sum(i => i.GetProperty("outstandingPrincipal").GetDecimal()).Should().Be(200m);
        using var payment = await Pay(id, 100m, "2026-10-15");
        payment.StatusCode.Should().Be(HttpStatusCode.OK);
        using var detailResponse = await Send(HttpMethod.Get, $"/v1/loans/{id}");
        var detail = await Body(detailResponse);
        var metadata = detail.GetProperty("payments")[0];
        metadata.GetProperty("recordSequence").GetInt64().Should().Be(1);
        metadata.GetProperty("calculationVersion").GetInt32().Should().Be(1);
        metadata.GetProperty("earlyPrincipalAmount").GetDecimal().Should().Be(100m);
        metadata.GetProperty("earlyPrincipalEffectiveDate").GetString().Should().Be("2026-11-01");
        metadata.GetProperty("remainingBalanceAfter").GetDecimal().Should().Be(200m);
        detail.GetProperty("summary").GetProperty("allocationOrder").GetString().Should().Be("InterestPrincipalLateInterest");
        using var list = await Send(HttpMethod.Get, "/v1/loans");
        (await Body(list))[0].GetProperty("earlyPaymentPolicy").GetString().Should().Be(policy);
    }

    [Theory]
    [InlineData("SimpleOnBalance", "ReduceInstallment")]
    [InlineData("SimpleOnBalance", "ReduceTerm")]
    [InlineData("FixedInstallment", "ReduceInstallment")]
    [InlineData("FixedInstallment", "ReduceTerm")]
    public async Task LoanQuote_InterestBearingReduction_ExcludesUnearnedInterestAndProtectsCurrentPeriod(string template, string policy)
    {
        var id = await CreateLoan(LoanRequest() with { Template = template, InterestRate = 0.1m, EarlyPaymentPolicy = policy });
        using var response = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?paymentDate=2026-10-15&amount=100");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var quote = await Body(response);
        quote.GetProperty("totalPayoff").GetDecimal().Should().Be(330m);
        quote.GetProperty("projectedInstallments")[0].GetProperty("outstandingRegularInterest").GetDecimal().Should().Be(30m);
        quote.GetProperty("proposedEarlyPrincipalAmount").GetDecimal().Should().Be(100m);
        quote.GetProperty("resultingPrincipal").GetDecimal().Should().Be(200m);
        using var paid = await Pay(id, 100m, "2026-10-15");
        paid.StatusCode.Should().Be(HttpStatusCode.OK);
        using var replayed = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?paymentDate=2026-10-15");
        replayed.StatusCode.Should().Be(HttpStatusCode.OK);
        var replay = await Body(replayed);
        replay.GetProperty("totalPayoff").GetDecimal().Should().Be(230m);
        replay.GetProperty("historicalSnapshots")[0].GetProperty("remainingTotal").GetDecimal().Should().Be(230m);
        replay.GetProperty("projectedInstallments").ToString().Should().Be(quote.GetProperty("projectedInstallments").ToString());
        replay.GetProperty("installments").GetArrayLength().Should().Be(3);
        if (policy == "ReduceTerm") replay.GetProperty("installments")[2].GetProperty("totalOutstanding").GetDecimal().Should().Be(0m);
    }

    [Fact]
    public async Task LoanQuote_AlternateAllocationOrder_IsUsedForPreviewAndCommit()
    {
        var id = await CreateLoan(LoanRequest() with
        {
            Template = "SimpleOnBalance",
            InterestRate = 0.1m,
            LateRate = 0.03m,
            AllocationOrder = "InterestPrincipalLateInterest"
        });
        using var response = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?amount=20");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var allocation = (await Body(response)).GetProperty("proposedAllocations")[0];
        allocation.GetProperty("toInterest").GetDecimal().Should().Be(20m);
        allocation.GetProperty("toLateInterest").GetDecimal().Should().Be(0m);
        using var paid = await Pay(id, 20m, "2026-11-11");
        paid.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Body(paid)).GetProperty("allocations")[0].ToString().Should().Be(allocation.ToString());
    }

    [Fact]
    public async Task LoanQuote_Detail_UsesDatedBalancesAndStableHistoricalTotals()
    {
        var id = await CreateLoan(LoanRequest() with { Template = "SimpleOnBalance", InterestRate = 0.1m, LateRate = 0.03m });
        using var first = await Pay(id, 100m, "2026-11-11");
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        using var before = await Send(HttpMethod.Get, $"/v1/loans/{id}");
        var firstHistory = (await Body(before)).GetProperty("payments")[0];
        firstHistory.GetProperty("remainingBalanceAfter").GetDecimal().Should().Be(261m);
        using var second = await Pay(id, 10m, "2026-11-12");
        second.StatusCode.Should().Be(HttpStatusCode.OK);
        using var detailResponse = await Send(HttpMethod.Get, $"/v1/loans/{id}");
        detailResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await Body(detailResponse);
        using var quoteResponse = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote?paymentDate=2026-11-12");
        var quote = await Body(quoteResponse);
        detail.GetProperty("summary").GetProperty("totalPayoff").GetDecimal().Should().Be(251.03m);
        detail.GetProperty("summary").GetProperty("suggestedAmount").GetDecimal().Should().Be(21.03m);
        detail.GetProperty("summary").GetProperty("lateRate").GetDecimal().Should().Be(0.03m);
        detail.GetProperty("summary").GetProperty("graceDays").GetInt32().Should().Be(0);
        var installment = detail.GetProperty("installments")[0];
        installment.GetProperty("outstandingPrincipal").GetDecimal().Should().Be(21.03m);
        installment.GetProperty("outstandingInterest").GetDecimal().Should().Be(0m);
        installment.GetProperty("outstandingLateInterest").GetDecimal().Should().Be(0m);
        installment.GetProperty("totalOutstanding").GetDecimal().Should().Be(21.03m);
        detail.GetProperty("payments")[1].GetProperty("remainingBalanceAfter").GetDecimal().Should().Be(261m);
        detail.GetProperty("payments")[1].GetProperty("isAmbiguous").GetBoolean().Should().BeFalse();
        quote.GetProperty("historicalSnapshots")[0].GetProperty("remainingTotal").GetDecimal().Should().Be(261m);
        quote.GetProperty("historicalSnapshots")[0].GetProperty("paymentId").GetGuid().Should().Be(firstHistory.GetProperty("id").GetGuid());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LoanQuote_LegacyHistory_OnlyTiedTimestampsAreAmbiguous(bool tied)
    {
        var id = await CreateLoan();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LendingDbContext>();
            var loan = await db.Loans.IgnoreQueryFilters().Include(l => l.Installments).SingleAsync(l => l.Id == id);
            var date = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc);
            for (var i = 0; i < 2; i++)
            {
                var payment = new LoanPayment(Guid.NewGuid(), userId, id, null, null, Money.Of(25m, Currency.USD), date, null, date.AddSeconds(tied ? 0 : i));
                payment.AddAllocation(loan.Installments.OrderBy(x => x.Number).First().Id, 0m, 0m, 25m);
                db.Payments.Add(payment);
            }
            await db.SaveChangesAsync();
        }
        using var detailResponse = await Send(HttpMethod.Get, $"/v1/loans/{id}");
        detailResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await Body(detailResponse);
        foreach (var payment in detail.GetProperty("payments").EnumerateArray())
        {
            payment.GetProperty("remainingBalanceAfter").ValueKind.Should().Be(tied ? JsonValueKind.Null : JsonValueKind.Number);
            if (!tied) payment.GetProperty("remainingBalanceAfter").GetDecimal().Should().BeOneOf(275m, 250m);
            payment.GetProperty("isAmbiguous").GetBoolean().Should().Be(tied);
            payment.GetProperty("recordSequence").ValueKind.Should().Be(JsonValueKind.Null);
        }
        using var quoteResponse = await Send(HttpMethod.Get, $"/v1/loans/{id}/quote");
        quoteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var quote = await Body(quoteResponse);
        quote.GetProperty("remainingPrincipal").GetDecimal().Should().Be(250m);
        foreach (var snapshot in quote.GetProperty("historicalSnapshots").EnumerateArray())
        {
            snapshot.GetProperty("remainingTotal").ValueKind.Should().Be(tied ? JsonValueKind.Null : JsonValueKind.Number);
            if (!tied) snapshot.GetProperty("remainingTotal").GetDecimal().Should().BeOneOf(275m, 250m);
            snapshot.GetProperty("isAmbiguous").GetBoolean().Should().Be(tied);
        }
    }

    private static CreateLoanRequest LoanRequest() => new("Synthetic quote counterparty", "Lent", "NoInterest", 300m, "USD", 0m,
        TotalInstallments: 3, DisbursementDate: new DateOnly(2026, 10, 1));

    private async Task<Guid> CreateLoan(CreateLoanRequest? request = null)
    {
        using var response = await Send(HttpMethod.Post, "/v1/loans", request ?? LoanRequest());
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await Body(response)).GetProperty("id").GetGuid();
    }

    private Task<HttpResponseMessage> Pay(Guid id, decimal amount, string date) => Send(HttpMethod.Post, $"/v1/loans/{id}/payments",
        new RegisterLoanPaymentRequest(amount, DateTime.Parse(date, System.Globalization.CultureInfo.InvariantCulture)));

    private async Task<HttpResponseMessage> Send(HttpMethod method, string path, object? body = null, Guid? owner = null)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("X-User-Id", (owner ?? userId).ToString());
        if (body is not null) request.Content = JsonContent.Create(body);
        return await client.SendAsync(request);
    }

    private static async Task<JsonElement> Body(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task AssertError(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        response.StatusCode.Should().Be(status);
        (await Body(response)).GetProperty("title").GetString().Should().Be(code);
    }

    public void Dispose()
    {
        client.Dispose();
        factory.Dispose();
    }

    private sealed class QuoteClock : IClock
    {
        public DateTime UtcNow => new(2026, 11, 11, 0, 0, 0, DateTimeKind.Utc);
        public DateOnly TodayUtc => DateOnly.FromDateTime(UtcNow);
    }
}
