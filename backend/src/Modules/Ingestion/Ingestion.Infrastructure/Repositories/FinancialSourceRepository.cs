using Ingestion.Application.Abstractions;
using Ingestion.Domain.FinancialSources;
using Microsoft.EntityFrameworkCore;

namespace Ingestion.Infrastructure.Repositories;

internal sealed class FinancialSourceRepository(IngestionDbContext context) : IFinancialSourceRepository
{
    public Task<FinancialSource?> GetBySourceIdAsync(Guid userId, string sourceId, CancellationToken cancellationToken = default)
    {
        return context.FinancialSources
            .FirstOrDefaultAsync(f => f.UserId == userId && f.SourceId == sourceId, cancellationToken);
    }

    public async Task AddOrUpdateAsync(FinancialSource source, CancellationToken cancellationToken = default)
    {
        var existing = await GetBySourceIdAsync(source.UserId, source.SourceId, cancellationToken);
        if (existing is null)
        {
            await context.FinancialSources.AddAsync(source, cancellationToken);
        }
        else
        {
            existing.UpdateDecision(source.Decision, source.DecidedAt);
            context.FinancialSources.Update(existing);
        }
    }
}
