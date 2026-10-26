using Api.Common;
using Lending.Application.Services;
using Lending.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class LoanEndpoints
{
    public static RouteGroupBuilder MapLoanEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/loans")
            .WithTags("Loans");

        group.MapPost("/simulate", (
            [FromBody] SimulateLoanRequest request,
            ILoanSimulationService simulationService) =>
        {
            var result = simulationService.Simulate(request);
            return result.ToHttpResult();
        })
        .WithName("SimulateLoanSchedule")
        .WithSummary("Simulate an amortization schedule and calculate total interest and TEA before creating a loan.")
        .Produces<LoanScheduleDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapPost("/", async (
            [FromBody] CreateLoanRequest request,
            ILoanService loanService,
            CancellationToken ct) =>
        {
            var result = await loanService.CreateLoanAsync(request, ct);
            return result.ToHttpResult(id => Results.Created($"/v1/loans/{id}", new { id }));
        })
        .WithName("CreateLoan")
        .WithSummary("Create a new loan with full amortization schedule.")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/", async (
            [FromQuery] string? type,
            [FromQuery] string? status,
            ILoanService loanService,
            CancellationToken ct) =>
        {
            var result = await loanService.GetLoansAsync(type, status, ct);
            return result.ToHttpResult();
        })
        .WithName("GetLoans")
        .WithSummary("List all loans of the authenticated user.")
        .Produces<List<LoanSummaryDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/{id:guid}", async (
            [FromRoute] Guid id,
            ILoanService loanService,
            CancellationToken ct) =>
        {
            var result = await loanService.GetLoanByIdAsync(id, ct);
            return result.ToHttpResult();
        })
        .WithName("GetLoanById")
        .WithSummary("Get loan details including complete installments schedule and payment history.")
        .Produces<LoanDetailDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/payments", async (
            [FromRoute] Guid id,
            [FromBody] RegisterLoanPaymentRequest request,
            ILoanService loanService,
            CancellationToken ct) =>
        {
            var result = await loanService.RegisterPaymentAsync(id, request, ct);
            return result.ToHttpResult();
        })
        .WithName("RegisterLoanPayment")
        .WithSummary("Register a payment on a loan with cascade allocation (late interest -> regular interest -> principal).")
        .Produces<LoanPaymentResultDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }
}
