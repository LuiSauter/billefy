using System.Text.Json;
using System.Text.Json.Serialization;
using Ingestion.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Ingestion.Infrastructure;

public sealed class IngestionFinancialDataExport(IngestionDbContext db) : IIngestionFinancialDataExport
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };

    public async Task<JsonElement> ExportForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var rawEvents = await db.RawEvents.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var drafts = await db.Drafts.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var draftEvents = await db.DraftEvents.AsNoTracking()
            .Where(x => db.Drafts.Any(draft => draft.Id == x.DraftId && draft.UserId == userId))
            .ToListAsync(cancellationToken);
        var financialSources = await db.FinancialSources.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var imports = await db.Imports.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);

        return JsonSerializer.SerializeToElement(new { rawEvents, drafts, draftEvents, financialSources, imports }, JsonOptions);
    }
}
