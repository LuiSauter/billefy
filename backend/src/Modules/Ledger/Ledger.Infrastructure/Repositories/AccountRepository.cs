using Ledger.Application.Abstractions;
using Ledger.Domain.Accounts;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Infrastructure.Repositories;

public sealed class AccountRepository : IAccountRepository
{
    private readonly LedgerDbContext _context;

    public AccountRepository(LedgerDbContext context)
    {
        _context = context;
    }

    public async Task<Account?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Accounts.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Account>> GetAllAsync(bool includeArchived = false, CancellationToken cancellationToken = default)
    {
        var query = _context.Accounts.AsQueryable();
        if (!includeArchived)
        {
            query = query.Where(a => !a.IsArchived);
        }

        return await query.ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Account account, CancellationToken cancellationToken = default)
    {
        await _context.Accounts.AddAsync(account, cancellationToken);
    }
}
