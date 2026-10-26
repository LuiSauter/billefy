using Ingestion.Domain.RawEvents;

namespace Ingestion.Application.Abstractions;

public interface IRawEventRepository
{
    Task<RawEvent?> GetByEventIdAsync(Guid userId, Guid eventId, CancellationToken cancellationToken = default);
    Task AddAsync(RawEvent rawEvent, CancellationToken cancellationToken = default);
}
