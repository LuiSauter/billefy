using System.Text.Json;

namespace Ingestion.Contracts;

public interface IIngestionFinancialDataExport
{
    Task<JsonElement> ExportForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
