namespace Fx.Contracts;

public sealed record RateSnapshotDto(
    decimal AppliedRate,
    string RateSource,
    DateTime FetchedAt,
    bool IsStale);
