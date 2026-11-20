using Ingestion.Domain.Imports;

namespace Ingestion.Application.Abstractions;

public interface IStatementImportRepository
{
    Task<StatementImport?> GetByHashAsync(Guid userId, string fileHash, CancellationToken cancellationToken = default);
    Task AddAsync(StatementImport statementImport, CancellationToken cancellationToken = default);
    Task<List<StatementImport>> GetByAccountIdAsync(Guid userId, Guid accountId, int limit = 10, CancellationToken cancellationToken = default);
}
