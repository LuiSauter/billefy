using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.ValueObjects;
using Ledger.Contracts;
using Planning.Application.Abstractions;
using Planning.Contracts;
using Planning.Domain.Goals;

namespace Planning.Application.Services;

public interface IGoalService
{
    Task<Result<Guid>> CreateGoalAsync(CreateGoalRequest request, CancellationToken cancellationToken = default);
    Task<Result<List<GoalDto>>> GetGoalsAsync(CancellationToken cancellationToken = default);
    Task<Result> DeleteGoalAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class GoalService(
    IGoalRepository goalRepository,
    ILedgerModule ledgerModule,
    IPlanningUnitOfWork unitOfWork,
    ICurrentUserContext userContext) : IGoalService
{
    public async Task<Result<Guid>> CreateGoalAsync(CreateGoalRequest request, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<Guid>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Result.Failure<Guid>(Error.Validation("Goal.InvalidName", "Goal name is required."));
        }

        if (request.TargetAmount <= decimal.Zero)
        {
            return Result.Failure<Guid>(Error.Validation("Goal.InvalidTargetAmount", "Target amount must be strictly positive."));
        }

        var currency = Currency.FromCode(request.Currency);
        var targetMoney = Money.Of(request.TargetAmount, currency);

        var goal = Goal.Create(
            userContext.UserId!.Value,
            request.Name,
            targetMoney,
            request.TargetDate,
            request.AccountId,
            DateTime.UtcNow);

        await goalRepository.AddAsync(goal, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(goal.Id);
    }

    public async Task<Result<List<GoalDto>>> GetGoalsAsync(CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<List<GoalDto>>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var userId = userContext.UserId!.Value;
        var goals = await goalRepository.GetByUserIdAsync(userId, cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var dtos = new List<GoalDto>();

        foreach (var g in goals)
        {
            decimal balance = decimal.Zero;
            if (g.AccountId.HasValue)
            {
                balance = await ledgerModule.GetAccountBalanceAsync(g.AccountId.Value, cancellationToken);
            }

            var eval = g.EvaluateProgress(balance, today);

            dtos.Add(new GoalDto(
                g.Id,
                g.AccountId,
                g.Name,
                g.TargetAmount.Amount,
                g.TargetAmount.Currency.Code,
                g.TargetDate,
                eval.CurrentAmount,
                eval.RemainingAmount,
                eval.PercentageAchieved,
                eval.MonthsRemaining,
                eval.MonthlyContributionNeeded,
                g.CreatedAt));
        }

        return Result.Success(dtos);
    }

    public async Task<Result> DeleteGoalAsync(Guid id, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var goal = await goalRepository.GetByIdAsync(id, cancellationToken);
        if (goal is null || goal.UserId != userContext.UserId!.Value)
        {
            return Result.Failure(Error.NotFound("Goal.NotFound", "Goal not found."));
        }

        await goalRepository.DeleteAsync(goal, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
