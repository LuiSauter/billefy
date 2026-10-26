using BuildingBlocks.Common;

namespace Ingestion.Domain.FinancialSources;

public sealed class FinancialSource : Entity
{
    public string SourceId { get; private set; }
    public string? Alias { get; private set; }
    public FinancialSourceDecision Decision { get; private set; }
    public DateTime DecidedAt { get; private set; }

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
        DateTime decidedAt)
        : base(id, userId, decidedAt)
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
        DateTime decidedAt)
    {
        return new FinancialSource(
            Guid.NewGuid(),
            userId,
            sourceId,
            alias,
            decision,
            decidedAt);
    }

    public void UpdateDecision(FinancialSourceDecision decision, DateTime decidedAt)
    {
        Decision = decision;
        DecidedAt = decidedAt;
    }
}
