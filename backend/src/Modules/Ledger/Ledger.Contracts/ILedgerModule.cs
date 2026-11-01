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

public sealed record InvestmentCashTransactionRequestDto(Guid UserId, Guid InvestmentId, Guid AccountId, decimal Amount,
    string Kind, DateTime OccurredAt, string? Description);
public sealed record InvestmentCashTransactionResultDto(Guid? TransactionId, string? ErrorCode);

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

public sealed record LedgerCategoryExpenseDto(Guid CategoryId, decimal Amount);

public sealed record LedgerCurrencySpendingDto(
    string Currency,
    decimal TotalExpenses,
    IReadOnlyList<LedgerCategoryExpenseDto> ExpensesByCategory);

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

    Task<InvestmentCashTransactionResultDto> RegisterInvestmentCashAsync(InvestmentCashTransactionRequestDto request, CancellationToken cancellationToken = default);
    Task<InvestmentCashTransactionResultDto> ReverseInvestmentCashAsync(Guid userId, Guid transactionId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LedgerCurrencyHealthMetricsDto>> GetMonthlyHealthMetricsAsync(
        Guid userId,
        DateTime monthStartUtc,
        DateTime monthEndUtcExclusive,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Legacy compatibility aggregate. Its scalar totals have no currency dimension and must not be used
    /// for currency-sensitive reporting; new consumers should use GetMonthlySpendingByCurrencyAsync.
    /// </summary>
    Task<MonthlyLedgerMetricsDto> GetMonthlyMetricsAsync(
        Guid userId,
        DateTime monthStart,
        DateTime monthEnd,
        CancellationToken cancellationToken = default);

    /// <summary>Returns active expense totals and category allocations grouped by native currency.</summary>
    Task<IReadOnlyList<LedgerCurrencySpendingDto>> GetMonthlySpendingByCurrencyAsync(
        Guid userId,
        DateTime monthStartUtc,
        DateTime monthEndUtcExclusive,
        CancellationToken cancellationToken = default);

    Task<decimal> GetAccountBalanceAsync(
        Guid accountId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LedgerAccountSummaryDto>> GetAccountsByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}
