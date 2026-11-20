using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Ledger.Application.Accounts.Services;
using Ledger.Domain.Accounts;
using Planning.Contracts;
using Xunit;

namespace Api.Tests;

public sealed class RecurringPaymentIntegrationTests
{
    [Fact]
    public async Task RecurringFlow_FullLifecycle_Create_Summary_Reschedule_Confirm_AdvancesNextDueDate()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();
        var userId = Guid.NewGuid();

        // 1. Create a bank account to fund recurring payments
        using var createAccReq = new HttpRequestMessage(HttpMethod.Post, "/v1/accounts")
        {
            Content = JsonContent.Create(new CreateAccountRequest("Banco Sol BOB", AccountType.Bank, "BOB", 1000m))
        };
        createAccReq.Headers.Add("X-User-Id", userId.ToString());
        using var accRes = await client.SendAsync(createAccReq);
        accRes.StatusCode.Should().Be(HttpStatusCode.Created);
        using var accDoc = JsonDocument.Parse(await accRes.Content.ReadAsStringAsync());
        var accountId = accDoc.RootElement.GetProperty("id").GetGuid();

        // 2. Create recurring payment (Expense: Netflix 69 BOB Monthly)
        var startDate = DateOnly.FromDateTime(DateTime.UtcNow);
        var createPayload = new CreateRecurringPaymentRequest(
            Name: "Netflix",
            Description: "Suscripción familiar",
            FlowType: "Expense",
            Amount: 69.00m,
            Currency: "BOB",
            Frequency: "Monthly",
            StartDate: startDate,
            DefaultAccountId: accountId);

        using var createReq = new HttpRequestMessage(HttpMethod.Post, "/v1/planning/recurring")
        {
            Content = JsonContent.Create(createPayload)
        };
        createReq.Headers.Add("X-User-Id", userId.ToString());
        using var createRes = await client.SendAsync(createReq);
        createRes.StatusCode.Should().Be(HttpStatusCode.Created);
        using var createDoc = JsonDocument.Parse(await createRes.Content.ReadAsStringAsync());
        var recurringId = createDoc.RootElement.GetProperty("id").GetGuid();
        recurringId.Should().NotBeEmpty();

        // 3. Get recurring list
        using var listReq = new HttpRequestMessage(HttpMethod.Get, "/v1/planning/recurring");
        listReq.Headers.Add("X-User-Id", userId.ToString());
        using var listRes = await client.SendAsync(listReq);
        listRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = await listRes.Content.ReadFromJsonAsync<List<RecurringPaymentDto>>();
        items.Should().NotBeNull();
        items.Should().ContainSingle(r => r.Id == recurringId && r.Name == "Netflix");

        // 4. Get summary KPIs
        using var summaryReq = new HttpRequestMessage(HttpMethod.Get, "/v1/planning/recurring/summary");
        summaryReq.Headers.Add("X-User-Id", userId.ToString());
        using var summaryRes = await client.SendAsync(summaryReq);
        summaryRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await summaryRes.Content.ReadFromJsonAsync<RecurringSummaryDto>();
        summary.Should().NotBeNull();
        summary!.ActiveCount.Should().Be(1);
        summary.MonthlyExpenses.Should().Be(69.00m);
        summary.Upcoming7DaysCount.Should().Be(1);
        summary.Upcoming7DaysTotal.Should().Be(69.00m);

        // 4b. Get calendar occurrences
        using var calendarReq = new HttpRequestMessage(HttpMethod.Get, "/v1/planning/recurring/calendar");
        calendarReq.Headers.Add("X-User-Id", userId.ToString());
        using var calendarRes = await client.SendAsync(calendarReq);
        calendarRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var occurrences = await calendarRes.Content.ReadFromJsonAsync<List<RecurringCalendarOccurrenceDto>>();
        occurrences.Should().NotBeNull();
        occurrences.Should().Contain(o => o.RecurringId == recurringId && o.Name == "Netflix");

        // 5. Reschedule
        var rescheduledDate = startDate.AddDays(5);
        using var reschedReq = new HttpRequestMessage(HttpMethod.Post, $"/v1/planning/recurring/{recurringId}/reschedule")
        {
            Content = JsonContent.Create(new RescheduleRecurringPaymentRequest(rescheduledDate))
        };
        reschedReq.Headers.Add("X-User-Id", userId.ToString());
        using var reschedRes = await client.SendAsync(reschedReq);
        reschedRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify rescheduled date
        using var getOneReq = new HttpRequestMessage(HttpMethod.Get, $"/v1/planning/recurring/{recurringId}");
        getOneReq.Headers.Add("X-User-Id", userId.ToString());
        using var getOneRes = await client.SendAsync(getOneReq);
        var fetched = await getOneRes.Content.ReadFromJsonAsync<RecurringPaymentDto>();
        fetched!.NextDueDate.Should().Be(rescheduledDate);

        // 6. Confirm payment ("Aceptar pago")
        using var confirmReq = new HttpRequestMessage(HttpMethod.Post, $"/v1/planning/recurring/{recurringId}/confirm")
        {
            Content = JsonContent.Create(new ConfirmRecurringPaymentRequest(
                AccountId: accountId,
                Amount: 69.00m,
                Description: "Pago Netflix Octubre"))
        };
        confirmReq.Headers.Add("X-User-Id", userId.ToString());
        using var confirmRes = await client.SendAsync(confirmReq);
        confirmRes.StatusCode.Should().Be(HttpStatusCode.OK);
        using var confirmDoc = JsonDocument.Parse(await confirmRes.Content.ReadAsStringAsync());
        var txnId = confirmDoc.RootElement.GetProperty("transactionId").GetGuid();
        txnId.Should().NotBeEmpty();

        // 7. Verify the recurring payment has advanced to the next month
        using var getUpdatedReq = new HttpRequestMessage(HttpMethod.Get, $"/v1/planning/recurring/{recurringId}");
        getUpdatedReq.Headers.Add("X-User-Id", userId.ToString());
        using var getUpdatedRes = await client.SendAsync(getUpdatedReq);
        var updated = await getUpdatedRes.Content.ReadFromJsonAsync<RecurringPaymentDto>();
        updated!.NextDueDate.Should().Be(rescheduledDate.AddMonths(1));

        // 8. Pause and Resume
        using var pauseReq = new HttpRequestMessage(HttpMethod.Post, $"/v1/planning/recurring/{recurringId}/pause");
        pauseReq.Headers.Add("X-User-Id", userId.ToString());
        var pauseRes = await client.SendAsync(pauseReq);
        pauseRes.StatusCode.Should().Be(HttpStatusCode.OK);

        using var resumeReq = new HttpRequestMessage(HttpMethod.Post, $"/v1/planning/recurring/{recurringId}/resume");
        resumeReq.Headers.Add("X-User-Id", userId.ToString());
        var resumeRes = await client.SendAsync(resumeReq);
        resumeRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 9. Delete
        using var delReq = new HttpRequestMessage(HttpMethod.Delete, $"/v1/planning/recurring/{recurringId}");
        delReq.Headers.Add("X-User-Id", userId.ToString());
        var delRes = await client.SendAsync(delReq);
        delRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
