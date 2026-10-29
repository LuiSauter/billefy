namespace Ledger.Contracts;

public sealed record LedgerAccountSummaryDto(
    Guid Id,
    string Name,
    string Type,
    string Currency,
    decimal Balance,
    DateTime CreatedAt);

public sealed record CreateTransactionFromDraftDto(
    Guid UserId,
    Guid AccountId,
    decimal Amount,
    string Currency,
    string Direction,
    Guid? CategoryId,
    DateTime OccurredAt,
    string? Description,
    Guid DraftId,
    string? Reference);

public sealed record MonthlyLedgerMetricsDto(
    decimal TotalIncome,
    decimal TotalExpense,
    decimal TotalLiquidBalance,
    Dictionary<Guid, decimal> ExpensesByCategory);

public interface ILedgerModule
{
    Task<Guid> CreateTransactionFromDraftAsync(
        CreateTransactionFromDraftDto dto,
        CancellationToken cancellationToken = default);

    Task<MonthlyLedgerMetricsDto> GetMonthlyMetricsAsync(
        Guid userId,
        DateTime monthStart,
        DateTime monthEnd,
        CancellationToken cancellationToken = default);

    Task<decimal> GetAccountBalanceAsync(
        Guid accountId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LedgerAccountSummaryDto>> GetAccountsByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}
