using Api.Common;
using Api.Infrastructure.Transactions;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Ledger.Contracts;
using Microsoft.AspNetCore.Mvc;
using Planning.Application.Services;
using Planning.Contracts;
using System.Text.Json;

namespace Api.Endpoints;

public static class PlanningEndpoints
{
    public static RouteGroupBuilder MapPlanningEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/planning")
            .WithTags("Planning")
            .RequireAuthorization();

        // Budgets
        group.MapPost("/budgets", async (
            [FromBody] CreateBudgetRequest request,
            IBudgetService service,
            CancellationToken ct) =>
        {
            var result = await service.CreateBudgetAsync(request, ct);
            return result.ToHttpResult(id => Results.Created($"/v1/planning/budgets/{id}", new { id }));
        })
        .WithName("CreateBudget")
        .WithSummary("Define a monthly spending budget per category or overall with alert thresholds (BUD-01).")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/budgets", async (
            IBudgetService service,
            CancellationToken ct) =>
        {
            var result = await service.GetBudgetsAsync(ct);
            return result.ToHttpResult();
        })
        .WithName("GetBudgets")
        .WithSummary("List active budgets evaluated against actual monthly spending from the Ledger.")
        .Produces<List<BudgetDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPut("/budgets/{id:guid}", async (
            [FromRoute] Guid id,
            [FromBody] UpdateBudgetRequest request,
            IBudgetService service,
            CancellationToken ct) =>
        {
            var result = await service.UpdateBudgetAsync(id, request, ct);
            return result.ToHttpResult(() => Results.NoContent());
        })
        .WithName("UpdateBudget")
        .WithSummary("Edit an active recurrent budget's limit and alert fraction without recreating it.")
        .WithDescription("Both limitAmount and alertThreshold are required. Amount is in the existing currency; alertThreshold is a fraction (0 < value <= 1, e.g. 0.80 = 80%). Preserves owner, category, currency, period, ID, creation time and active state. Missing, foreign and inactive budgets return 404; invalid values return 400 without mutation. Does not create historical monthly versions.")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/budgets/{id:guid}", async (
            [FromRoute] Guid id,
            IBudgetService service,
            CancellationToken ct) =>
        {
            var result = await service.DeleteBudgetAsync(id, ct);
            return result.ToHttpResult(() => Results.Ok(new { message = "Budget deleted" }));
        })
        .WithName("DeleteBudget")
        .WithSummary("Delete or deactivate a budget.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        // Investments & assets
        group.MapPost("/investments", async (
            [FromBody] CreateInvestmentRequest request,
            IInvestmentService service,
            CancellationToken ct) =>
        {
            var result = await service.CreateAsync(request, ct);
            return result.ToHttpResult(id => Results.Created($"/v1/planning/investments/{id}", new { id }));
        })
        .WithName("CreateInvestment")
        .WithSummary("Register an investment or asset with its current value.")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/investments", async (
            IInvestmentService service,
            CancellationToken ct) =>
        {
            var result = await service.GetAllAsync(ct);
            return result.ToHttpResult();
        })
        .WithName("GetInvestments")
        .WithSummary("List investments with auto-calculated variation.")
        .Produces<List<InvestmentDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPut("/investments/{id:guid}/value", async (
            [FromRoute] Guid id,
            [FromBody] UpdateInvestmentValueRequest request,
            IInvestmentService service,
            CancellationToken ct) =>
        {
            var result = await service.UpdateValueAsync(id, request, ct);
            return result.ToHttpResult();
        })
        .WithName("UpdateInvestmentValue")
        .WithSummary("Record a new valuation; variation is recalculated from history.")
        .Produces<InvestmentDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/investments/{id:guid}/cash/{kind}", async (
            [FromRoute] Guid id,
            [FromRoute] string kind,
            [FromBody] InvestmentCashRequest request,
            RelationalInvestmentCashTransaction coordinator,
            ILedgerModule ledger,
            ICurrentUserContext user,
            IClock clock,
            CancellationToken ct) =>
        {
            if (!Enum.TryParse<Ledger.Domain.Transactions.InvestmentCashKind>(kind, true, out var parsed) || !Enum.IsDefined(parsed))
                return Results.Problem(statusCode: StatusCodes.Status400BadRequest, title: "InvestmentCash.InvalidKind", detail: "Kind must be Contribution or Disposal.");
            var result = await coordinator.RegisterAsync(id, parsed.ToString(), request, ledger, user, clock, ct);
            if (result.IsSuccess) return Results.Created($"/v1/transactions/{result.Value.LedgerTransactionId}", result.Value);
            return result.ToHttpResult();
        })
        .WithName("RegisterInvestmentCash")
        .WithSummary("Register an account-affecting investment contribution or disposal without changing valuation.")
        .Produces<InvestmentCashResult>(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPost("/investment-cash/{transactionId:guid}/reverse", async (
            [FromRoute] Guid transactionId,
            RelationalInvestmentCashTransaction coordinator,
            ILedgerModule ledger,
            ICurrentUserContext user,
            IClock clock,
            CancellationToken ct) =>
        {
            var result = await coordinator.ReverseAsync(transactionId, ledger, user, clock, ct);
            return result.ToHttpResult(value => Results.Ok(value));
        })
        .WithName("ReverseInvestmentCash")
        .WithSummary("Reverse a linked investment cash movement atomically while retaining its audit link.")
        .Produces<InvestmentCashResult>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapDelete("/investments/{id:guid}", async (
            [FromRoute] Guid id,
            IInvestmentService service,
            CancellationToken ct) =>
        {
            var result = await service.DeleteAsync(id, ct);
            return result.ToHttpResult(() => Results.Ok(new { message = "Investment deleted" }));
        })
        .WithName("ArchiveInvestment")
        .WithSummary("Archive an investment without deleting linked cash history.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/investments/{id:guid}/operations", async (
            [FromRoute] Guid id,
            [FromBody] RegisterInvestmentOperationRequest request,
            IInvestmentService service,
            CancellationToken ct) =>
        {
            var result = await service.RegisterOperationAsync(id, request, ct);
            return result.ToHttpResult(tx => Results.Created($"/v1/planning/investments/{id}/transactions/{tx.Id}", tx));
        })
        .WithName("RegisterInvestmentOperation")
        .WithSummary("Register an immutable investment operation (buy, sell, dividend, fee, revaluation).")
        .Produces<InvestmentTransactionDto>(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapGet("/investments/{id:guid}/transactions", async (
            [FromRoute] Guid id,
            IInvestmentService service,
            CancellationToken ct) =>
        {
            var result = await service.GetTransactionsAsync(id, ct);
            return result.ToHttpResult();
        })
        .WithName("GetInvestmentTransactions")
        .WithSummary("Get full transaction audit log for an investment.")
        .Produces<List<InvestmentTransactionDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        // Public stock / ETF market quote proxy
        group.MapGet("/market/quote", async (
            [FromQuery] string ticker,
            IHttpClientFactory httpClientFactory,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(ticker) || ticker.Length > 20)
                return Results.Problem(statusCode: StatusCodes.Status400BadRequest, title: "Market.InvalidTicker", detail: "A valid ticker symbol is required.");

            var cleanTicker = ticker.Trim().ToUpperInvariant();
            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            client.Timeout = TimeSpan.FromSeconds(10);

            try
            {
                var response = await client.GetAsync($"https://query1.finance.yahoo.com/v8/finance/chart/{Uri.EscapeDataString(cleanTicker)}?interval=1d&range=1d", ct);
                if (!response.IsSuccessStatusCode)
                    return Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Market.QuoteNotFound", detail: $"Quote for ticker '{cleanTicker}' not found.");

                var content = await response.Content.ReadAsStringAsync(ct);
                using var doc = JsonDocument.Parse(content);

                if (!doc.RootElement.TryGetProperty("chart", out var chartEl) ||
                    !chartEl.TryGetProperty("result", out var resultEl) ||
                    resultEl.ValueKind != JsonValueKind.Array ||
                    resultEl.GetArrayLength() == 0)
                {
                    return Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Market.QuoteNotFound", detail: $"No market data found for '{cleanTicker}'.");
                }

                var metaEl = resultEl[0].GetProperty("meta");
                var symbol = metaEl.TryGetProperty("symbol", out var symEl) ? symEl.GetString() ?? cleanTicker : cleanTicker;
                var currency = metaEl.TryGetProperty("currency", out var currEl) ? currEl.GetString() ?? "USD" : "USD";
                var exchange = metaEl.TryGetProperty("fullExchangeName", out var exEl) ? exEl.GetString() : null;

                decimal price = decimal.Zero;
                if (metaEl.TryGetProperty("regularMarketPrice", out var priceEl) && priceEl.ValueKind == JsonValueKind.Number)
                {
                    price = priceEl.GetDecimal();
                }

                decimal? changePercent = null;
                if (metaEl.TryGetProperty("regularMarketChangePercent", out var cpEl) && cpEl.ValueKind == JsonValueKind.Number)
                {
                    changePercent = cpEl.GetDecimal();
                }

                if (price <= decimal.Zero)
                {
                    return Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Market.QuoteNotFound", detail: $"Price for ticker '{cleanTicker}' is unavailable.");
                }

                return Results.Ok(new StockQuoteDto(
                    symbol,
                    price,
                    changePercent,
                    currency,
                    exchange,
                    DateTime.UtcNow));
            }
            catch (Exception)
            {
                return Results.Problem(statusCode: StatusCodes.Status502BadGateway, title: "Market.UpstreamError", detail: "Could not fetch quote from public market provider.");
            }
        })
        .WithName("GetMarketQuote")
        .WithSummary("Fetch real-time stock/ETF quote from public market data.")
        .Produces<StockQuoteDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status502BadGateway);

        // Distribution plan (optional per user)
        group.MapGet("/distribution-plan", async (
            IDistributionPlanService service,
            CancellationToken ct) =>
        {
            var result = await service.GetAsync(ct);
            return result.ToHttpResult();
        })
        .WithName("GetDistributionPlan")
        .WithSummary("Get the user's income distribution plan (disabled and empty by default).")
        .Produces<DistributionPlanDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPut("/distribution-plan", async (
            [FromBody] SaveDistributionPlanRequest request,
            IDistributionPlanService service,
            CancellationToken ct) =>
        {
            var result = await service.SaveAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("SaveDistributionPlan")
        .WithSummary("Create or replace the user's income distribution plan.")
        .Produces<DistributionPlanDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        // Goals
        group.MapPost("/goals", async (
            [FromBody] CreateGoalRequest request,
            IGoalService service,
            CancellationToken ct) =>
        {
            var result = await service.CreateGoalAsync(request, ct);
            return result.ToHttpResult(id => Results.Created($"/v1/planning/goals/{id}", new { id }));
        })
        .WithName("CreateGoal")
        .WithSummary("Create a savings goal with target amount, target date, and associated account (BUD-03).")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/goals", async (
            IGoalService service,
            CancellationToken ct) =>
        {
            var result = await service.GetGoalsAsync(ct);
            return result.ToHttpResult();
        })
        .WithName("GetGoals")
        .WithSummary("List savings goals evaluated with current account progress and required monthly contribution.")
        .Produces<List<GoalDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPut("/goals/{id:guid}", async (
            [FromRoute] Guid id,
            [FromBody] UpdateGoalRequest request,
            IGoalService service,
            CancellationToken ct) =>
        {
            var result = await service.UpdateGoalAsync(id, request, ct);
            return result.ToHttpResult(() => Results.Ok(new { message = "Goal updated" }));
        })
        .WithName("UpdateGoal")
        .WithSummary("Update a savings goal.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/goals/{id:guid}", async (
            [FromRoute] Guid id,
            IGoalService service,
            CancellationToken ct) =>
        {
            var result = await service.DeleteGoalAsync(id, ct);
            return result.ToHttpResult(() => Results.Ok(new { message = "Goal deleted" }));
        })
        .WithName("DeleteGoal")
        .WithSummary("Delete a savings goal.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        // Financial Health
        group.MapGet("/financial-health", async (
            IFinancialHealthService service,
            CancellationToken ct) =>
        {
            var result = await service.GetFinancialHealthAsync(ct);
            return result.ToHttpResult();
        })
        .WithName("GetFinancialHealth")
        .WithSummary("Get financial health indicators: savings rate, emergency fund coverage, debt load, and 50/30/20 guideline (BUD-04).")
        .Produces<FinancialHealthDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/income-distribution/propose", async (
            [FromBody] ProposeIncomeDistributionRequest request,
            IIncomeDistributionService service,
            CancellationToken ct) =>
        {
            var result = await service.ProposeDistributionAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("ProposeIncomeDistribution")
        .WithSummary("Generate an income distribution proposal based on 50/30/20 guideline and active debt obligations (BUD-05).")
        .Produces<IncomeDistributionProposal>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest);

        // Recurring Payments & Scheduled Flows
        group.MapGet("/recurring", async (
            [FromQuery] string? flowType,
            [FromQuery] string? status,
            [FromQuery] string? search,
            IRecurringPaymentService service,
            CancellationToken ct) =>
        {
            var result = await service.GetAllAsync(flowType, status, search, ct);
            return result.ToHttpResult();
        })
        .WithName("GetRecurringPayments")
        .WithSummary("List recurring payments and flows with optional status, flow type, and search filters.")
        .Produces<List<RecurringPaymentDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/recurring/summary", async (
            [FromQuery] string? currency,
            IRecurringPaymentService service,
            CancellationToken ct) =>
        {
            var result = await service.GetSummaryAsync(currency, ct);
            return result.ToHttpResult();
        })
        .WithName("GetRecurringSummary")
        .WithSummary("Get summary KPIs for recurring flows (active count, monthly expenses, monthly income, next 7 days, overdue).")
        .Produces<RecurringSummaryDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/recurring/calendar", async (
            [FromQuery] DateOnly? start,
            [FromQuery] DateOnly? end,
            IRecurringPaymentService service,
            CancellationToken ct) =>
        {
            var from = start ?? DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-1));
            var to = end ?? DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(2));
            var result = await service.GetCalendarOccurrencesAsync(from, to, ct);
            return result.ToHttpResult();
        })
        .WithName("GetRecurringCalendarOccurrences")
        .WithSummary("Get projected scheduled payment occurrences between two dates for calendar visualization.")
        .Produces<List<RecurringCalendarOccurrenceDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/recurring/{id:guid}", async (
            [FromRoute] Guid id,
            IRecurringPaymentService service,
            CancellationToken ct) =>
        {
            var result = await service.GetByIdAsync(id, ct);
            return result.ToHttpResult();
        })
        .WithName("GetRecurringPaymentById")
        .WithSummary("Get a single recurring payment by its ID.")
        .Produces<RecurringPaymentDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/recurring", async (
            [FromBody] CreateRecurringPaymentRequest request,
            IRecurringPaymentService service,
            CancellationToken ct) =>
        {
            var result = await service.CreateAsync(request, ct);
            return result.ToHttpResult(id => Results.Created($"/v1/planning/recurring/{id}", new { id }));
        })
        .WithName("CreateRecurringPayment")
        .WithSummary("Register a new recurring payment or income flow.")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPut("/recurring/{id:guid}", async (
            [FromRoute] Guid id,
            [FromBody] UpdateRecurringPaymentRequest request,
            IRecurringPaymentService service,
            CancellationToken ct) =>
        {
            var result = await service.UpdateAsync(id, request, ct);
            return result.ToHttpResult(() => Results.Ok(new { message = "Recurring payment updated" }));
        })
        .WithName("UpdateRecurringPayment")
        .WithSummary("Update details of an existing recurring payment.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/recurring/{id:guid}", async (
            [FromRoute] Guid id,
            IRecurringPaymentService service,
            CancellationToken ct) =>
        {
            var result = await service.DeleteAsync(id, ct);
            return result.ToHttpResult(() => Results.Ok(new { message = "Recurring payment deleted" }));
        })
        .WithName("DeleteRecurringPayment")
        .WithSummary("Delete a recurring payment.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/recurring/{id:guid}/reschedule", async (
            [FromRoute] Guid id,
            [FromBody] RescheduleRecurringPaymentRequest request,
            IRecurringPaymentService service,
            CancellationToken ct) =>
        {
            var result = await service.RescheduleAsync(id, request, ct);
            return result.ToHttpResult(() => Results.Ok(new { message = "Recurring payment rescheduled" }));
        })
        .WithName("RescheduleRecurringPayment")
        .WithSummary("Reschedule the next due date of a recurring payment.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/recurring/{id:guid}/pause", async (
            [FromRoute] Guid id,
            IRecurringPaymentService service,
            CancellationToken ct) =>
        {
            var result = await service.PauseAsync(id, ct);
            return result.ToHttpResult(() => Results.Ok(new { message = "Recurring payment paused" }));
        })
        .WithName("PauseRecurringPayment")
        .WithSummary("Pause an active recurring payment.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/recurring/{id:guid}/resume", async (
            [FromRoute] Guid id,
            IRecurringPaymentService service,
            CancellationToken ct) =>
        {
            var result = await service.ResumeAsync(id, ct);
            return result.ToHttpResult(() => Results.Ok(new { message = "Recurring payment resumed" }));
        })
        .WithName("ResumeRecurringPayment")
        .WithSummary("Resume a paused recurring payment.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/recurring/{id:guid}/confirm", async (
            [FromRoute] Guid id,
            [FromBody] ConfirmRecurringPaymentRequest request,
            IRecurringPaymentService service,
            CancellationToken ct) =>
        {
            var result = await service.ConfirmPaymentAsync(id, request, ct);
            return result.ToHttpResult(transactionId => Results.Ok(new { transactionId }));
        })
        .WithName("ConfirmRecurringPayment")
        .WithSummary("Accept and execute a scheduled payment, creating an immutable Ledger transaction and advancing to the next cycle.")
        .Produces(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }
}
