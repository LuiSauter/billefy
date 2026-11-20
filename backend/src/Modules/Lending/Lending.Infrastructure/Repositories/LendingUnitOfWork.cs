using Lending.Application.Abstractions;

namespace Lending.Infrastructure.Repositories;

internal sealed class LendingUnitOfWork(LendingDbContext context) : ILendingUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return context.SaveChangesAsync(cancellationToken);
    }
}
