using Ingestion.Application.Abstractions;
using Ingestion.Domain.Drafts;
using Microsoft.EntityFrameworkCore;

namespace Ingestion.Infrastructure.Repositories;

internal sealed class DraftRepository(IngestionDbContext context) : IDraftRepository
{
    public Task<Draft?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return context.Drafts
            .Include(d => d.Events)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
    }

    public async Task<Draft?> FindDuplicateAsync(
        Guid userId,
        string fingerprint,
        string? reference,
        decimal amount,
        string currency,
        DraftDirection direction,
        DateTimeOffset windowStart,
        DateTimeOffset windowEnd,
        CancellationToken cancellationToken = default)
    {
        // 1. Exact fingerprint match
        var byFingerprint = await context.Drafts
            .Include(d => d.Events)
            .FirstOrDefaultAsync(
                d => d.UserId == userId && d.Fingerprint == fingerprint,
                cancellationToken);

        if (byFingerprint is not null)
        {
            return byFingerprint;
        }

        // 2. Reference match (if reference exists)
        if (!string.IsNullOrWhiteSpace(reference))
        {
            var cleanRef = reference.Trim();
            var byRef = await context.Drafts
                .Include(d => d.Events)
                .FirstOrDefaultAsync(
                    d => d.UserId == userId && d.Reference == cleanRef,
                    cancellationToken);

            if (byRef is not null)
            {
                return byRef;
            }
        }

        // 3. Time window (±5 mins) with same amount, currency, direction
        return await context.Drafts
            .Include(d => d.Events)
            .FirstOrDefaultAsync(
                d => d.UserId == userId &&
                     d.Amount.Amount == amount &&
                     d.Amount.Currency.Code == currency &&
                     d.Direction == direction &&
                     d.EstimatedDate >= windowStart &&
                     d.EstimatedDate <= windowEnd,
                cancellationToken);
    }

    public Task<List<Draft>> GetByUserIdAsync(
        Guid userId,
        DraftStatus? status = null,
        int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var query = context.Drafts
            .Include(d => d.Events)
            .Where(d => d.UserId == userId);

        if (status.HasValue)
        {
            query = query.Where(d => d.Status == status.Value);
        }

        return query
            .OrderByDescending(d => d.EstimatedDate)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Draft draft, CancellationToken cancellationToken = default)
    {
        await context.Drafts.AddAsync(draft, cancellationToken);
    }

    public Task UpdateAsync(Draft draft, CancellationToken cancellationToken = default)
    {
        context.Drafts.Update(draft);
        return Task.CompletedTask;
    }
}
