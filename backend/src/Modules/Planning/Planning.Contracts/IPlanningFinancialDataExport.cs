using System.Text.Json;

namespace Planning.Contracts;

public interface IPlanningFinancialDataExport
{
    Task<JsonElement> ExportForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
