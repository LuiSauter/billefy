using System.ComponentModel;

namespace Planning.Contracts;

public sealed record InvestmentValuePointDto(DateTime At, decimal Value);

public sealed record InvestmentDto(
    Guid Id,
    string Name,
    string Kind,
    string IconKey,
    string ColorKey,
    string Currency,
    decimal Quantity,
    decimal InitialValue,
    decimal CurrentValue,
    decimal? VariationPct,
    List<InvestmentValuePointDto> History,
    DateTime CreatedAt);

public sealed record CreateInvestmentRequest(
    string Name,
    string Kind,
    string IconKey,
    string ColorKey,
    string Currency,
    decimal Quantity,
    decimal CurrentValue);

public sealed record UpdateInvestmentValueRequest(decimal CurrentValue, decimal? Quantity = null);

public sealed record PlanBucketDto(
    string Id,
    string Name,
    decimal Percent,
    string ColorKey,
    List<string> CategoryIds,
    [property: Description("Expenses tracks assigned category expenses. TargetOnly is an allocation target without contribution tracking and requires no assigned categories. Omission defaults to Expenses; explicit null and other values are rejected.")]
    [property: DefaultValue("Expenses")]
    string TrackingMode = "Expenses");

public sealed record DistributionPlanDto(bool Enabled, List<PlanBucketDto> Buckets);

public sealed record SaveDistributionPlanRequest(bool Enabled, List<PlanBucketDto> Buckets);
