using BuildingBlocks.Common;

namespace Ingestion.Application.Services;

public sealed record ImportStatementCsvRequest(
    Guid AccountId,
    string FileName,
    string CsvContent,
    string Currency);

public sealed record StatementImportResult(
    Guid ImportId,
    string FileName,
    string FileHash,
    bool IsDuplicateFile,
    string? Warning,
    int TotalRows,
    int DraftsCreated,
    int DuplicatesLinked);

public interface IStatementImportService
{
    Task<Result<StatementImportResult>> ImportCsvAsync(
        ImportStatementCsvRequest request,
        CancellationToken cancellationToken = default);
}
