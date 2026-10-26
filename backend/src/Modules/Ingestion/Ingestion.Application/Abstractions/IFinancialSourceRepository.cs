using Ingestion.Domain.FinancialSources;

namespace Ingestion.Application.Abstractions;

public interface IFinancialSourceRepository
{
    Task<FinancialSource?> GetBySourceIdAsync(Guid userId, string sourceId, CancellationToken cancellationToken = default);
    Task AddOrUpdateAsync(FinancialSource source, CancellationToken cancellationToken = default);
}
