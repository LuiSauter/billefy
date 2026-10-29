using Ingestion.Application.Abstractions;
using Ingestion.Domain.Imports;
using Microsoft.EntityFrameworkCore;

namespace Ingestion.Infrastructure.Repositories;

internal sealed class StatementImportRepository(IngestionDbContext context) : IStatementImportRepository
{
    public Task<StatementImport?> GetByHashAsync(Guid userId, string fileHash, CancellationToken cancellationToken = default)
    {
        return context.Imports
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.UserId == userId && i.FileHash == fileHash, cancellationToken);
    }

    public async Task AddAsync(StatementImport statementImport, CancellationToken cancellationToken = default)
    {
        await context.Imports.AddAsync(statementImport, cancellationToken);
    }

    public Task<List<StatementImport>> GetByAccountIdAsync(Guid userId, Guid accountId, int limit = 10, CancellationToken cancellationToken = default)
    {
        return context.Imports
            .IgnoreQueryFilters()
            .Where(i => i.UserId == userId && i.AccountId == accountId)
            .OrderByDescending(i => i.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }
}
