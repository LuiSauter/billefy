using Ledger.Domain.Transactions;

namespace Ledger.Application.Abstractions;

public sealed record MonthlyTransactionCurrencyTotal(string Currency, decimal Income, decimal Expenses);

public interface ITransactionRepository
{
    Task<Transaction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Transaction?> GetReversalByOriginalIdAsync(Guid originalId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Transaction>> GetByAccountIdAsync(Guid accountId, CancellationToken cancellationToken = default);
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
    Task<decimal> CalculateBalanceAsync(Guid accountId, CancellationToken cancellationToken = default);
    Task AddAsync(Transaction transaction, CancellationToken cancellationToken = default);
    Task AddRangeAsync(IEnumerable<Transaction> transactions, CancellationToken cancellationToken = default);
}
