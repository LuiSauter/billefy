namespace BuildingBlocks.Time;

public interface IClock
{
    DateTime UtcNow { get; }
    DateOnly TodayUtc { get; }
}
