using Planning.Application.Abstractions;

namespace Planning.Infrastructure.Repositories;

internal sealed class PlanningUnitOfWork(PlanningDbContext context) : IPlanningUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return context.SaveChangesAsync(cancellationToken);
    }
}
