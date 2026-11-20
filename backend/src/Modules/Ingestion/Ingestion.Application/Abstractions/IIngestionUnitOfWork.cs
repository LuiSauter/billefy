namespace Ingestion.Application.Abstractions;

public interface IIngestionUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
