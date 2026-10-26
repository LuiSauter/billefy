using Ledger.Application.Abstractions;

namespace Ledger.Infrastructure.Repositories;

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly LedgerDbContext _context;

    public UnitOfWork(LedgerDbContext context)
    {
        _context = context;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _context.SaveChangesAsync(cancellationToken);
}
