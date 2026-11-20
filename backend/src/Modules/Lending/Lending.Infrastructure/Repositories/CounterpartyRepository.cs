using Lending.Application.Abstractions;
using Lending.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Lending.Infrastructure.Repositories;

internal sealed class CounterpartyRepository(LendingDbContext context) : ICounterpartyRepository
{
    public Task<Counterparty?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return context.Counterparties.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    public Task<List<Counterparty>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return context.Counterparties
            .IgnoreQueryFilters()
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Counterparty counterparty, CancellationToken cancellationToken = default)
    {
        await context.Counterparties.AddAsync(counterparty, cancellationToken);
    }
}
