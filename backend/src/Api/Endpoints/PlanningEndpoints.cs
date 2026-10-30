using Api.Common;
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

        group.MapDelete("/investments/{id:guid}", async (
            [FromRoute] Guid id,
            IInvestmentService service,
            CancellationToken ct) =>
        {
            var result = await service.DeleteAsync(id, ct);
            return result.ToHttpResult(() => Results.Ok(new { message = "Investment deleted" }));
        })
        .WithName("DeleteInvestment")
        .WithSummary("Delete an investment.")
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
