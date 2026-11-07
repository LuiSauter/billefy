using Ingestion.Application.Abstractions;
using Ingestion.Domain.FinancialSources;
using Microsoft.EntityFrameworkCore;

namespace Ingestion.Infrastructure.Repositories;

public sealed class BinanceCredentialRepository(IngestionDbContext dbContext) : IBinanceCredentialRepository
{
    public async Task<BinanceCredential?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await dbContext.BinanceCredentials
            .FirstOrDefaultAsync(c => c.UserId == userId && c.IsActive, cancellationToken);
    }

    public async Task AddAsync(BinanceCredential credential, CancellationToken cancellationToken = default)
    {
        await dbContext.BinanceCredentials.AddAsync(credential, cancellationToken);
    }

    public Task UpdateAsync(BinanceCredential credential, CancellationToken cancellationToken = default)
    {
        dbContext.BinanceCredentials.Update(credential);
        return Task.CompletedTask;
    }
}
