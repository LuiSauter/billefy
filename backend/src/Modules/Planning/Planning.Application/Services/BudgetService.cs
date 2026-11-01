using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Ledger.Contracts;
using Planning.Application.Abstractions;
using Planning.Contracts;
using Planning.Domain.Budgets;

namespace Planning.Application.Services;

public interface IBudgetService
{
    Task<Result<Guid>> CreateBudgetAsync(CreateBudgetRequest request, CancellationToken cancellationToken = default);
    Task<Result<List<BudgetDto>>> GetBudgetsAsync(CancellationToken cancellationToken = default);
    Task<Result> UpdateBudgetAsync(Guid id, UpdateBudgetRequest request, CancellationToken cancellationToken = default);
    Task<Result> DeleteBudgetAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class BudgetService(
    IBudgetRepository budgetRepository,
    ILedgerModule ledgerModule,
    IPlanningUnitOfWork unitOfWork,
    ICurrentUserContext userContext,
    IClock clock) : IBudgetService
{
    public async Task<Result<Guid>> CreateBudgetAsync(CreateBudgetRequest request, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<Guid>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (request.LimitAmount <= decimal.Zero)
        {
            return Result.Failure<Guid>(Error.Validation("Budget.InvalidLimit", "Budget limit must be strictly positive."));
        }

        var currency = Currency.FromCode(request.Currency);
        var limitMoney = Money.Of(request.LimitAmount, currency);

        var budget = Budget.Create(
            userContext.UserId!.Value,
            request.CategoryId,
            limitMoney,
            request.AlertThreshold,
            request.Period,
            clock.UtcNow);

        await budgetRepository.AddAsync(budget, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(budget.Id);
    }

    public async Task<Result<List<BudgetDto>>> GetBudgetsAsync(CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<List<BudgetDto>>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var userId = userContext.UserId!.Value;
        var budgets = await budgetRepository.GetByUserIdAsync(userId, onlyActive: true, cancellationToken);

        // Current month bounds
        var now = clock.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1).AddTicks(-1);

        var ledgerMetrics = await ledgerModule.GetMonthlyMetricsAsync(userId, monthStart, monthEnd, cancellationToken);

        var dtos = new List<BudgetDto>();

        foreach (var b in budgets)
        {
            decimal spent;
            if (b.CategoryId.HasValue)
            {
                spent = ledgerMetrics.ExpensesByCategory.GetValueOrDefault(b.CategoryId.Value, decimal.Zero);
            }
            else
            {
                // Overall budget
                spent = ledgerMetrics.TotalExpense;
            }

            var eval = b.EvaluateConsumption(spent);

            dtos.Add(new BudgetDto(
                b.Id,
                b.CategoryId,
                b.Period,
                b.LimitAmount.Amount,
                b.LimitAmount.Currency.Code,
                b.AlertThreshold,
                eval.SpentAmount,
                eval.RemainingAmount,
                eval.PercentageUsed,
                eval.IsAlertTriggered,
                eval.IsExceeded,
                b.IsActive,
                b.CreatedAt));
        }

        return Result.Success(dtos);
    }

    public async Task<Result> UpdateBudgetAsync(Guid id, UpdateBudgetRequest request, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var budget = await budgetRepository.GetByIdAsync(id, cancellationToken);
        if (budget is null || budget.UserId != userContext.UserId!.Value || !budget.IsActive)
        {
            return Result.Failure(Error.NotFound("Budget.NotFound", "Active budget not found."));
        }

        if (request.LimitAmount is not > decimal.Zero)
        {
            return Result.Failure(Error.Validation("Budget.InvalidLimit", "Budget limit is required and must be strictly positive."));
        }

        var limitMoney = Money.Of(request.LimitAmount.Value, budget.LimitAmount.Currency);
        if (limitMoney.Amount <= decimal.Zero)
        {
            return Result.Failure(Error.Validation("Budget.InvalidLimit", "Budget limit must be strictly positive after currency rounding."));
        }

        if (request.AlertThreshold is not > decimal.Zero || request.AlertThreshold > 1m)
        {
            return Result.Failure(Error.Validation("Budget.InvalidAlertThreshold", "Alert threshold must be greater than 0 and at most 1 (0.80 means 80%)."));
        }

        budget.UpdateLimit(limitMoney, request.AlertThreshold.Value);
        await budgetRepository.UpdateAsync(budget, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result> DeleteBudgetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var budget = await budgetRepository.GetByIdAsync(id, cancellationToken);
        if (budget is null || budget.UserId != userContext.UserId!.Value)
        {
            return Result.Failure(Error.NotFound("Budget.NotFound", "Budget not found."));
        }

        await budgetRepository.DeleteAsync(budget, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
