using BuildingBlocks.Common;

namespace Planning.Domain.Distribution;

/// <summary>Optional per-user plan that splits monthly income into custom percentage buckets.</summary>
public sealed class DistributionPlan : Entity
{
    public bool IsEnabled { get; private set; }
    public string BucketsJson { get; private set; }

    // Required by EF Core
    private DistributionPlan() : base()
    {
        BucketsJson = "[]";
    }

    private DistributionPlan(Guid userId, bool isEnabled, string bucketsJson, DateTime createdAt)
        : base(Guid.NewGuid(), userId, createdAt)
    {
        IsEnabled = isEnabled;
        BucketsJson = bucketsJson;
    }

    public static DistributionPlan Create(Guid userId, bool isEnabled, string bucketsJson, DateTime createdAt) =>
        new(userId, isEnabled, bucketsJson, createdAt);

    public void Update(bool isEnabled, string bucketsJson)
    {
        IsEnabled = isEnabled;
        BucketsJson = bucketsJson;
    }
}
