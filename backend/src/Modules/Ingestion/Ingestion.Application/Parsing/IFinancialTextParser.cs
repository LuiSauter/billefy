using Ingestion.Domain.Drafts;

namespace Ingestion.Application.Parsing;

public sealed record FinancialParseResult(
    bool Success,
    decimal Amount,
    string Currency,
    DraftDirection Direction,
    string? Reference,
    decimal Confidence,
    string? AccountHint,
    string? FailureReason = null)
{
    public static FinancialParseResult Failed(string reason) =>
        new(false, 0m, "USD", DraftDirection.Expense, null, 0.0m, null, reason);
}

public interface IFinancialTextParser
{
    FinancialParseResult Parse(string text, DateTime receivedAt);
}
