using System.Text.Json;

namespace Lending.Contracts;

public interface ILendingFinancialDataExport
{
    Task<JsonElement> ExportForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
