using Ingestion.Application.Abstractions;
using Ingestion.Domain.RawEvents;
using Microsoft.EntityFrameworkCore;

namespace Ingestion.Infrastructure.Repositories;

internal sealed class RawEventRepository(IngestionDbContext context) : IRawEventRepository
{
    public Task<RawEvent?> GetByEventIdAsync(Guid userId, Guid eventId, CancellationToken cancellationToken = default)
    {
        return context.RawEvents
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.UserId == userId && e.EventId == eventId, cancellationToken);
    }

    public async Task AddAsync(RawEvent rawEvent, CancellationToken cancellationToken = default)
    {
        await context.RawEvents.AddAsync(rawEvent, cancellationToken);
    }
}
