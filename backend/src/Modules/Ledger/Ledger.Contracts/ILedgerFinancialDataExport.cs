using System.Text.Json;

namespace Ledger.Contracts;

public interface ILedgerFinancialDataExport
{
    Task<JsonElement> ExportForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
