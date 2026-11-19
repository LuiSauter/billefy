using System.Globalization;
using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Ledger.Contracts;
using Microsoft.EntityFrameworkCore;
using Planning.Application.Abstractions;
using Planning.Contracts;
using Planning.Domain.Goals;

namespace Planning.Infrastructure;

internal sealed class GoalFundingService(PlanningDbContext db, ILedgerModule ledger,
    ICurrentUserContext user, IClock clock) : IGoalFundingService
{
    public Task<List<GoalFundingEntry>> GetForUserAsync(Guid userId, CancellationToken ct = default) =>
        db.GoalFundingEntries.AsNoTracking().Where(e => e.UserId == userId).ToListAsync(ct);

    public async Task<Result<List<GoalFundingEntryDto>>> GetHistoryAsync(Guid goalId, CancellationToken ct = default)
    {
        if (!user.IsAuthenticated) return Result.Failure<List<GoalFundingEntryDto>>(Unauthorized());
        if (!await db.Goals.AnyAsync(g => g.Id == goalId && g.UserId == user.UserId, ct))
            return Result.Failure<List<GoalFundingEntryDto>>(Error.NotFound("Goal.NotFound", "Goal not found."));
        var entries = await db.GoalFundingEntries.AsNoTracking().Where(e => e.GoalId == goalId && e.UserId == user.UserId)
            .OrderBy(e => e.CreatedAt).ThenBy(e => e.Id).ToListAsync(ct);
        return Result.Success(entries.Select(ToDto).ToList());
    }

    public async Task<Result<GoalFundingResult>> RecordAsync(Guid goalId, string kind, GoalFundingRequest request,
        Guid? key, CancellationToken ct = default)
    {
        if (!user.IsAuthenticated || user.UserId is null) return Result.Failure<GoalFundingResult>(Unauthorized());
        var uid = user.UserId.Value;
        var goal = await db.Goals.FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == uid, ct);
        if (goal is null) return Fail(Error.NotFound("Goal.NotFound", "Goal not found."));
        if (goal.FundingMode != GoalFundingMode.ReservedFunds)
            return Fail(Error.Conflict("GoalFunding.InvalidMode", "Only reserved-funds goals accept funding entries."));
        if (kind is not ("assign" or "release"))
            return Fail(Error.Validation("GoalFunding.InvalidKind", "Kind must be assign or release."));
        if (!key.HasValue || key == Guid.Empty)
            return Fail(Error.Validation("GoalFunding.IdempotencyKeyRequired", "A nonempty Idempotency-Key UUID is required."));
        if (!string.Equals(request.Currency, goal.TargetAmount.Currency.Code, StringComparison.Ordinal))
            return Fail(Error.Validation("GoalFunding.CurrencyMismatch", "Funding currency must match the goal currency."));
        if (request.Amount <= 0 || request.Amount > 99999999999999999999m ||
            Money.RoundToScale(request.Amount, goal.TargetAmount.Currency.DecimalPlaces) != request.Amount)
            return Fail(Error.Validation("GoalFunding.InvalidAmount", "Amount must be positive and use the currency precision."));

        var previous = await db.GoalFundingEntries.AsNoTracking().FirstOrDefaultAsync(e => e.UserId == uid && e.IdempotencyKey == key.Value, ct);
        if (previous is not null) return Replay(previous, goalId, kind, request);
        var accountId = goal.AccountId!.Value;
        var bucket = await db.GoalFundingAccounts.FirstOrDefaultAsync(a => a.UserId == uid && a.AccountId == accountId, ct);
        var newBucket = bucket is null;
        bucket ??= new GoalFundingAccount(uid, accountId);
        if (newBucket) db.GoalFundingAccounts.Add(bucket);
        var revision = bucket.Revision;
        var entries = await db.GoalFundingEntries.AsNoTracking().Where(e => e.UserId == uid && e.AccountId == accountId).ToListAsync(ct);
        var assignedToGoal = entries.Where(e => e.GoalId == goalId).Sum(e => e.SignedAmount);
        if (kind == "release" && request.Amount > assignedToGoal)
            return Fail(Error.Conflict("GoalFunding.ExcessiveRelease", "Release cannot exceed this goal's assigned amount."));
        if (kind == "assign")
        {
            var account = (await ledger.GetAccountsByUserIdAsync(uid, ct)).FirstOrDefault(a => a.Id == accountId);
            if (account is null) return Fail(Error.NotFound("Goal.AccountNotFound", "Linked active account was not found."));
            if (!string.Equals(account.Currency, request.Currency, StringComparison.Ordinal))
                return Fail(Error.Validation("GoalFunding.CurrencyMismatch", "Linked account currency must match the funding currency."));
            if (request.Amount > Math.Max(0m, account.Balance - entries.Sum(e => e.SignedAmount)))
                return Fail(Error.Conflict("GoalFunding.InsufficientFunds", "Amount exceeds the account's unreserved balance."));
        }

        var entry = new GoalFundingEntry(uid, goalId, accountId, key.Value, Money.Of(request.Amount, goal.TargetAmount.Currency),
            kind == "release", request.OccurredAt?.UtcDateTime ?? clock.UtcNow, request.OccurredAt.HasValue, clock.UtcNow);
        bucket.Advance();
        goal.AdvanceFundingRevision();
        db.GoalFundingEntries.Add(entry);
        try
        {
            // One atomic SaveChanges: token updates and entry insert either all commit or all roll back.
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex)
        {
            db.ChangeTracker.Clear();
            var replay = await db.GoalFundingEntries.AsNoTracking().FirstOrDefaultAsync(e => e.UserId == uid && e.IdempotencyKey == key.Value, ct);
            if (replay is not null) return Replay(replay, goalId, kind, request);
            var current = await db.GoalFundingAccounts.AsNoTracking().FirstOrDefaultAsync(a => a.UserId == uid && a.AccountId == accountId, ct);
            // Handle only a proven competing write, not arbitrary database failures.
            var currentGoal = await db.Goals.AsNoTracking().FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == uid, ct);
            if (ex is DbUpdateConcurrencyException || current is not null && (newBucket || current.Revision != revision) ||
                currentGoal is null || currentGoal.FundingRevision != goal.FundingRevision - 1)
                return Fail(Error.Conflict("GoalFunding.ConcurrentChange", "Reservations changed concurrently. Refresh and retry with the same key."));
            throw;
        }
        return Result.Success(new GoalFundingResult(ToDto(entry), false));
    }

    private static Result<GoalFundingResult> Replay(GoalFundingEntry entry, Guid goalId, string kind, GoalFundingRequest request)
    {
        var signed = kind == "release" ? -request.Amount : request.Amount;
        if (entry.GoalId != goalId || entry.SignedAmount != signed || entry.Currency != request.Currency ||
            entry.ExplicitDate != request.OccurredAt.HasValue || request.OccurredAt.HasValue && entry.OccurredAt != request.OccurredAt.Value.UtcDateTime)
            return Fail(Error.Conflict("GoalFunding.IdempotencyConflict", "This key was used with a different funding request."));
        return Result.Success(new GoalFundingResult(ToDto(entry), true));
    }

    private static GoalFundingEntryDto ToDto(GoalFundingEntry e) =>
        new(e.Id, e.GoalId, e.AccountId, e.SignedAmount < 0 ? "release" : "assign",
            decimal.Parse(Math.Abs(e.SignedAmount).ToString("0.############################", CultureInfo.InvariantCulture), CultureInfo.InvariantCulture),
            e.Currency, e.OccurredAt, e.CreatedAt);
    private static Error Unauthorized() => Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
    private static Result<GoalFundingResult> Fail(Error error) => Result.Failure<GoalFundingResult>(error);
}
