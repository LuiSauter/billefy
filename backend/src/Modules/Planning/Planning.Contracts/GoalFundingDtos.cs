namespace Planning.Contracts;

public sealed record GoalFundingRequest(decimal Amount, string Currency, DateTimeOffset? OccurredAt = null);
public sealed record GoalFundingEntryDto(Guid Id, Guid GoalId, Guid AccountId, string Kind,
    decimal Amount, string Currency, DateTime OccurredAt, DateTime CreatedAt);
public sealed record GoalFundingResult(GoalFundingEntryDto Entry, bool Replayed);
