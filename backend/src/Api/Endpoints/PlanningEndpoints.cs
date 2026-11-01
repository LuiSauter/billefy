using Api.Common;
using Api.Infrastructure.Transactions;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Ledger.Contracts;
using Microsoft.AspNetCore.Mvc;
using Planning.Application.Services;
using Planning.Contracts;

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

        return group;
    }
}
