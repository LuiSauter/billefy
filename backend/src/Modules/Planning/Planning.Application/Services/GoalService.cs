using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
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
    ICurrentUserContext userContext,
    IClock clock) : IGoalService
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

        var userId = userContext.UserId!.Value;

        if (request.AccountId.HasValue && request.AccountId.Value != Guid.Empty)
        {
            var userAccounts = await ledgerModule.GetAccountsByUserIdAsync(userId, cancellationToken);
            if (!userAccounts.Any(a => a.Id == request.AccountId.Value))
            {
                return Result.Failure<Guid>(Error.NotFound("Goal.AccountNotFound", "Linked account was not found or does not belong to the user."));
            }
        }

        var currency = Currency.FromCode(request.Currency);
        var targetMoney = Money.Of(request.TargetAmount, currency);

        var goal = Goal.Create(
            userId,
            request.Name,
            targetMoney,
            request.TargetDate,
            request.AccountId,
            clock.UtcNow);

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
        var userAccounts = await ledgerModule.GetAccountsByUserIdAsync(userId, cancellationToken);
        var accountBalances = userAccounts.ToDictionary(a => a.Id, a => a.Balance);
        var today = DateOnly.FromDateTime(clock.UtcNow);

        var dtos = new List<GoalDto>();

        foreach (var g in goals)
        {
            decimal balance = decimal.Zero;
            if (g.AccountId.HasValue && accountBalances.TryGetValue(g.AccountId.Value, out var accBalance))
            {
                balance = accBalance;
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
