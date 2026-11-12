using Ingestion.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Ingestion.Infrastructure;

public sealed class IngestionFinancialDataReset(IngestionDbContext db) : IIngestionFinancialDataReset
{
    public async Task ResetForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Draft events are linked to drafts and must be removed before drafts are deleted.
        await db.DraftEvents
            .Where(e => db.Drafts.Where(d => d.UserId == userId).Select(d => d.Id).Contains(e.DraftId))
            .ExecuteDeleteAsync(cancellationToken);
        await db.Drafts.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.RawEvents.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.FinancialSources.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.BinanceCredentials.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Imports.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
    }
}
