using Ledger.Domain.Accounts;

namespace Ledger.Application.Abstractions;

public interface IAccountRepository
{
    Task<Account?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Account?> GetByIdForUserAsync(Guid userId, Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Account>> GetAllAsync(bool includeArchived = false, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Account>> GetByUserIdAsync(Guid userId, bool includeArchived = false, CancellationToken cancellationToken = default);
    Task AddAsync(Account account, CancellationToken cancellationToken = default);
}
