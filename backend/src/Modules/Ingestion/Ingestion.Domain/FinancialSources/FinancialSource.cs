using BuildingBlocks.Common;

namespace Ingestion.Domain.FinancialSources;

public sealed class FinancialSource : Entity
{
    public string SourceId { get; private set; }
    public string? Alias { get; private set; }
    public FinancialSourceDecision Decision { get; private set; }
    public DateTimeOffset DecidedAt { get; private set; }

    private FinancialSource() : base()
    {
        SourceId = string.Empty;
    }

    public FinancialSource(
        Guid id,
        Guid userId,
        string sourceId,
        string? alias,
        FinancialSourceDecision decision,
        DateTimeOffset decidedAt)
        : base(id, userId, decidedAt.UtcDateTime)
    {
        if (string.IsNullOrWhiteSpace(sourceId))
            throw new ArgumentException("SourceId cannot be empty.", nameof(sourceId));

        SourceId = sourceId;
        Alias = alias;
        Decision = decision;
        DecidedAt = decidedAt;
    }

    public static FinancialSource Create(
        Guid userId,
        string sourceId,
        string? alias,
        FinancialSourceDecision decision,
        DateTimeOffset decidedAt)
    {
        return new FinancialSource(
            Guid.NewGuid(),
            userId,
            sourceId,
            alias,
            decision,
            decidedAt);
    }

    public void UpdateDecision(FinancialSourceDecision decision, DateTimeOffset decidedAt)
    {
        Decision = decision;
        DecidedAt = decidedAt;
    }
}
