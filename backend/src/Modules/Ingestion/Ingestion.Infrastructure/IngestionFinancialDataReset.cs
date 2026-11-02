using Ingestion.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Ingestion.Infrastructure;

public sealed class IngestionFinancialDataReset(IngestionDbContext db) : IIngestionFinancialDataReset
{
    public async Task ResetForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Draft events are owned by drafts and cascade when those parent records are removed.
        await db.Drafts.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.RawEvents.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.FinancialSources.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Imports.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
    }
}
