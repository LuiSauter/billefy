using Api.Common;
using BuildingBlocks.Common;
using Lending.Application.Services;
using Lending.Application.Abstractions;
using Lending.Contracts;
using Lending.Domain.Engine.DynamicPayments;
using Lending.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class LoanEndpoints
{
    public static RouteGroupBuilder MapLoanEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/loans")
            .WithTags("Loans")
            .RequireAuthorization();

        group.MapPost("/simulate", (
            [FromBody] SimulateLoanRequest request,
            ILoanSimulationService simulationService) =>
        {
            if (!Enum.TryParse<LoanTemplate>(request.Template, ignoreCase: true, out var template) || !Enum.IsDefined(template))
                return ResultExtensions.ToProblem(Error.Validation("Loan.InvalidTemplate", $"Unknown template '{request.Template}'."));
            if (!Enum.TryParse<EarlyPaymentPolicy>(request.EarlyPaymentPolicy ?? nameof(EarlyPaymentPolicy.AdvanceInstallments), ignoreCase: true, out var earlyPolicy)
                || !Enum.IsDefined(earlyPolicy))
                return ResultExtensions.ToProblem(Error.Validation("Loan.InvalidEarlyPaymentPolicy", $"Unknown early payment policy '{request.EarlyPaymentPolicy}'."));
            if (!Enum.TryParse<PaymentAllocationOrder>(request.AllocationOrder ?? nameof(PaymentAllocationOrder.LateInterestInterestPrincipal), ignoreCase: true, out var allocOrder)
                || !Enum.IsDefined(allocOrder))
                return ResultExtensions.ToProblem(Error.Validation("Loan.InvalidAllocationOrder", $"Unknown allocation order '{request.AllocationOrder}'."));
            if (!DynamicLoanPaymentCalculator.IsCompatible(template, earlyPolicy))
                return ResultExtensions.ToProblem(Error.Validation("Loan.IncompatiblePolicy", $"Policy '{earlyPolicy}' is incompatible with template '{template}'."));

            var result = simulationService.Simulate(request);
            return result.ToHttpResult();
        })
        .WithName("SimulateLoanSchedule")
        .WithSummary("Simulate an amortization schedule and calculate total interest and TEA before creating a loan.")
        .Produces<LoanScheduleDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .AllowAnonymous();

        group.MapPost("/", async (
            [FromBody] CreateLoanRequest request,
            [FromHeader(Name = "Idempotency-Key")] Guid? key,
            ILoanService loanService,
            CancellationToken ct) =>
        {
            var result = await loanService.CreateLoanAsync(request with { IdempotencyKey = key ?? request.IdempotencyKey }, ct);
            return result.ToHttpResult(id => Results.Created($"/v1/loans/{id}", new { id }));
        })
        .WithName("CreateLoan")
        .WithSummary("Create a cash loan or existing opening debt; CreditCard uses a no-interest opening obligation.")
        .WithDescription("originationKind: CashDisbursement (default) posts principal cash, never income/expense; OpeningBalance records existing principal without cash. loanKind: Loan (default) or CreditCard. Optional Idempotency-Key UUID replays the same payload; changed payload returns 409.")
        .Produces(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

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

        group.MapGet("/{id:guid}/quote", async (
            [FromRoute] Guid id,
            [FromQuery] DateOnly? paymentDate,
            [FromQuery] decimal? amount,
            ILoanService loanService,
            CancellationToken ct) =>
        {
            var result = await loanService.GetPaymentQuoteAsync(id, paymentDate, amount, ct);
            return result.ToHttpResult();
        })
        .WithName("GetLoanPaymentQuote")
        .WithSummary("Get authoritative dated payment quote, payoff amount, suggested installment amount, and preview allocations.")
        .Produces<LoanPaymentQuoteDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/cancel", async (
            [FromRoute] Guid id,
            ILoanService loanService,
            CancellationToken ct) =>
        {
            var result = await loanService.CancelLoanAsync(id, ct);
            return result.ToHttpResult();
        })
        .WithName("CancelLoan")
        .WithSummary("Cancel an active loan with no payments, reversing only its exactly linked disbursement.")
        .Produces<LoanCancellationResultDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPost("/{id:guid}/payments", async (
            [FromRoute] Guid id,
            [FromBody] RegisterLoanPaymentRequest request,
            [FromHeader(Name = "Idempotency-Key")] Guid? key,
            ILoanService loanService,
            CancellationToken ct) =>
        {
            var result = await loanService.RegisterPaymentAsync(id, request with { IdempotencyKey = key ?? request.IdempotencyKey }, ct);
            return result.ToHttpResult();
        })
        .WithName("RegisterLoanPayment")
        .WithSummary("Allocate a payment and post principal separately from recognized interest.")
        .WithDescription("Principal changes cash and debt/receivable only; interestCategoryId categorizes recognized interest. Idempotency-Key replays a successful payment, conflicts return 409. Card payments require an actual account.")
        .Produces<LoanPaymentResultDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPost("/{id:guid}/purchases", async (Guid id, [FromBody] RegisterCardPurchaseRequest request,
            [FromHeader(Name = "Idempotency-Key")] Guid? key, ILoanPurchaseService service, CancellationToken ct) =>
        {
            var result = await service.RegisterPurchaseAsync(id, request with { IdempotencyKey = key ?? request.IdempotencyKey }, ct);
            return result.ToHttpResult(purchaseId => Results.Created($"/v1/loans/{id}/purchases/{purchaseId}", new { id = purchaseId }));
        })
        .WithName("RegisterCardPurchase")
        .WithSummary("Recognize a dated card expense and principal liability atomically, without cash.")
        .WithDescription("Requires an owned CreditCard loan, matching currency, positive currency-precision amount, UTC occurredAt, and owned expense category when supplied. Optional Idempotency-Key UUID replays 201; changed payload returns 409. Purchases are append-only and included in loan detail.")
        .Produces(StatusCodes.Status201Created).ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized).ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }
}
