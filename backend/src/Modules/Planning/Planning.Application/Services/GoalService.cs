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
        if (request.AccountId == Guid.Empty)
        {
            return Result.Failure<Guid>(Error.Validation("Goal.InvalidAccount", "Linked account ID must not be empty."));
        }

        var currency = Currency.FromCode(request.Currency);
        if (request.AccountId.HasValue)
        {
            var userAccounts = await ledgerModule.GetAccountsByUserIdAsync(userId, cancellationToken);
            var account = userAccounts.FirstOrDefault(a => a.Id == request.AccountId.Value);
            if (account is null)
            {
                return Result.Failure<Guid>(Error.NotFound("Goal.AccountNotFound", "Linked active account was not found or does not belong to the user."));
            }

            if (!string.Equals(account.Currency, currency.Code, StringComparison.Ordinal))
            {
                return Result.Failure<Guid>(Error.Validation("Goal.CurrencyMismatch", "Goal currency must match the linked account currency."));
            }
        }

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
        var accountsById = userAccounts.ToDictionary(a => a.Id);
        var goalCountsByAccount = goals
            .Where(goal => goal.AccountId.HasValue)
            .GroupBy(goal => goal.AccountId!.Value)
            .ToDictionary(group => group.Key, group => group.Count());
        var today = DateOnly.FromDateTime(clock.UtcNow);

        var dtos = new List<GoalDto>();

        foreach (var g in goals)
        {
            accountsById.TryGetValue(g.AccountId ?? Guid.Empty, out var account);
            var status = g.AccountId is null
                ? "unlinked"
                : account is null
                    ? "unavailable"
                    : !string.Equals(account.Currency, g.TargetAmount.Currency.Code, StringComparison.Ordinal)
                        ? "currency_mismatch"
                        : "tracked";
            var isTracked = status == "tracked";
            var eval = isTracked ? g.EvaluateProgress(account!.Balance, today) : null;

            dtos.Add(new GoalDto(
                g.Id,
                g.AccountId,
                account?.Name,
                status,
                g.AccountId.HasValue ? Math.Max(0, goalCountsByAccount.GetValueOrDefault(g.AccountId.Value) - 1) : 0,
                g.Name,
                g.TargetAmount.Amount,
                g.TargetAmount.Currency.Code,
                g.TargetDate,
                eval?.CurrentAmount,
                eval?.RemainingAmount,
                eval?.PercentageAchieved,
                eval?.MonthsRemaining,
                eval?.MonthlyContributionNeeded,
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
