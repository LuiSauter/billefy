using Ingestion.Domain.Drafts;

namespace Ingestion.Application.Abstractions;

public interface IDraftRepository
{
    Task<Draft?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Draft?> FindDuplicateAsync(
        Guid userId,
        string fingerprint,
        string? reference,
        decimal amount,
        string currency,
        DraftDirection direction,
        DateTime windowStart,
        DateTime windowEnd,
        CancellationToken cancellationToken = default);

    Task<List<Draft>> GetByUserIdAsync(
        Guid userId,
        DraftStatus? status = null,
        int limit = 50,
        CancellationToken cancellationToken = default);

    Task AddAsync(Draft draft, CancellationToken cancellationToken = default);
    Task UpdateAsync(Draft draft, CancellationToken cancellationToken = default);
}
