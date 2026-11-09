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
    DateTime CreatedAt,
    DateTime? ArchivedAt = null,
    string? Ticker = null);

public sealed record CreateInvestmentRequest(
    string Name,
    string Kind,
    string IconKey,
    string ColorKey,
    string Currency,
    decimal Quantity,
    decimal CurrentValue,
    string? Ticker = null);

public sealed record UpdateInvestmentValueRequest(decimal CurrentValue, decimal? Quantity = null);

public sealed record InvestmentTransactionDto(
    Guid Id,
    Guid InvestmentId,
    string Type,
    decimal Quantity,
    decimal UnitPrice,
    decimal TotalAmount,
    decimal Fees,
    DateTime OccurredAt,
    string? Notes,
    Guid? LedgerTransactionId,
    DateTime CreatedAt);

public sealed record RegisterInvestmentOperationRequest(
    string Type,
    decimal Quantity,
    decimal UnitPrice,
    decimal TotalAmount,
    decimal Fees = 0m,
    DateTime? OccurredAt = null,
    string? Notes = null,
    Guid? LinkedAccountId = null);

public sealed record InvestmentCashRequest(Guid AccountId, decimal Amount, string? Description = null, DateTime? OccurredAt = null);
public sealed record InvestmentCashResult(Guid LedgerTransactionId, Guid InvestmentId, string Kind);

public sealed record StockQuoteDto(
    string Ticker,
    decimal Price,
    decimal? ChangePercent,
    string Currency,
    string? ExchangeName,
    DateTime UpdatedAt);

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
