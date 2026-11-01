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

public sealed record LoanDisbursementReversalResultDto(Guid? ReversalTransactionId, string? ErrorCode);

public sealed record LoanDisbursementReversalRequestDto(
    Guid UserId,
    Guid TransactionId,
    Guid AccountId,
    decimal Principal,
    string Currency,
    string ExpectedDirection);

public sealed record LedgerCurrencyHealthMetricsDto(
    string Currency,
    decimal MonthlyIncome,
    decimal MonthlyExpenses,
    decimal CurrentBalance);

public interface ILedgerModule
{
    /// <summary>Returns expense category IDs owned by the authenticated current user.</summary>
    Task<IReadOnlyList<Guid>> GetExpenseCategoryIdsForCurrentUserAsync(
        CancellationToken cancellationToken = default);

    Task<Guid> CreateTransactionFromDraftAsync(
        CreateTransactionFromDraftDto dto,
        CancellationToken cancellationToken = default);

    Task<LoanDisbursementReversalResultDto> ValidateLoanDisbursementReversalAsync(
        LoanDisbursementReversalRequestDto request,
        CancellationToken cancellationToken = default);

    Task<LoanDisbursementReversalResultDto> ReverseLoanDisbursementAsync(
        LoanDisbursementReversalRequestDto request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LedgerCurrencyHealthMetricsDto>> GetMonthlyHealthMetricsAsync(
        Guid userId,
        DateTime monthStartUtc,
        DateTime monthEndUtcExclusive,
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
