using Ingestion.Application.Abstractions;

namespace Ingestion.Infrastructure.Repositories;

internal sealed class IngestionUnitOfWork(IngestionDbContext context) : IIngestionUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return context.SaveChangesAsync(cancellationToken);
    }
}
