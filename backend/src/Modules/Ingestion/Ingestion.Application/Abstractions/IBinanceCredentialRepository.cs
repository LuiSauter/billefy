using Ingestion.Domain.FinancialSources;

namespace Ingestion.Application.Abstractions;

public interface IBinanceCredentialRepository
{
    Task<BinanceCredential?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(BinanceCredential credential, CancellationToken cancellationToken = default);
    Task UpdateAsync(BinanceCredential credential, CancellationToken cancellationToken = default);
}
