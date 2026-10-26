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
            .WithTags("Planning");

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

        return group;
    }
}
