using Ledger.Domain.Transactions;

namespace Ledger.Application.Abstractions;

public sealed record MonthlyTransactionCurrencyTotal(string Currency, decimal Income, decimal Expenses);
public sealed record MonthlyCategoryExpense(string Currency, Guid CategoryId, decimal Amount);

public sealed record MovementRepositoryQuery(
    DateTime? StartUtc,
    DateTime? EndUtcExclusive,
    Guid? AccountId,
    Guid? CategoryId,
    string? Type,
    string? Search,
    bool AuditMode,
    int Page,
    int PageSize);

public sealed record MovementQueryRow(
    Guid Id, Guid AccountId, string AccountName, decimal Amount, string Currency, TransactionDirection Direction,
    Guid? CategoryId, string? CategoryName, DateTime OccurredAt, string? Description, Guid? ReversesId,
    Guid? TransferId, decimal? AppliedRate, string? RateSource, DateTime CreatedAt, Guid? InvestmentId, string? InvestmentCashKind,
    bool IsReconciliationAdjustment);

public sealed record AllocationQueryRow(Guid CategoryId, string? CategoryName, decimal Amount);
public sealed record MovementQueryEntry(MovementQueryRow Representative, IReadOnlyList<MovementQueryRow> Legs, bool IsTransfer,
    IReadOnlyList<AllocationQueryRow> Allocations);
public sealed record MovementQueryCurrencySummary(string Currency, decimal Income, decimal Expenses,
    decimal TransferOut, decimal TransferIn, decimal Contributions, decimal Disposals);
public sealed record MovementQueryPage(
    IReadOnlyList<MovementQueryEntry> Items,
    int TotalCount,
    IReadOnlyList<MovementQueryCurrencySummary> Summary);

public interface ITransactionRepository
{
    Task<Transaction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Transaction?> GetReversalByOriginalIdAsync(Guid originalId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Transaction>> GetTransferLegsAsync(Guid userId, Guid transferId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Transaction>> GetByAccountIdAsync(Guid accountId, CancellationToken cancellationToken = default);
    Task<MovementQueryPage> GetMovementPageAsync(Guid userId, MovementRepositoryQuery query, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Transaction>> GetFilteredAsync(
        Guid? userId = null,
        Guid? accountId = null,
        TransactionDirection? direction = null,
        DateTime? from = null,
        DateTime? to = null,
        int limit = 50,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MonthlyTransactionCurrencyTotal>> GetMonthlyActivityByCurrencyAsync(
        Guid userId,
        DateTime monthStartUtc,
        DateTime monthEndUtcExclusive,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MonthlyCategoryExpense>> GetMonthlyCategoryExpensesAsync(
        Guid userId,
        DateTime monthStartUtc,
        DateTime monthEndUtcExclusive,
        CancellationToken cancellationToken = default);
    Task<decimal> CalculateBalanceAsync(Guid accountId, CancellationToken cancellationToken = default);
    Task AddAsync(Transaction transaction, CancellationToken cancellationToken = default);
    Task AddRangeAsync(IEnumerable<Transaction> transactions, CancellationToken cancellationToken = default);
}
