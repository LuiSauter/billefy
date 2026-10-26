using Ledger.Domain.Transactions;

namespace Ledger.Application.Abstractions;

public interface ITransactionRepository
{
    Task<Transaction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Transaction>> GetByAccountIdAsync(Guid accountId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Transaction>> GetFilteredAsync(
        Guid? accountId = null,
        TransactionDirection? direction = null,
        DateTime? from = null,
        DateTime? to = null,
        int limit = 50,
        CancellationToken cancellationToken = default);
    Task<decimal> CalculateBalanceAsync(Guid accountId, CancellationToken cancellationToken = default);
    Task AddAsync(Transaction transaction, CancellationToken cancellationToken = default);
    Task AddRangeAsync(IEnumerable<Transaction> transactions, CancellationToken cancellationToken = default);
}
