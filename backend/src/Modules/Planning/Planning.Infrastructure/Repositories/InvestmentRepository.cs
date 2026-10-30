using Microsoft.EntityFrameworkCore;
using Planning.Application.Abstractions;
using Planning.Domain.Investments;

namespace Planning.Infrastructure.Repositories;

internal sealed class InvestmentRepository(PlanningDbContext context) : IInvestmentRepository
{
    public Task<Investment?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.Investments.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

    public Task<List<Investment>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        context.Investments
            .IgnoreQueryFilters()
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Investment investment, CancellationToken cancellationToken = default) =>
        await context.Investments.AddAsync(investment, cancellationToken);

    public Task DeleteAsync(Investment investment, CancellationToken cancellationToken = default)
    {
        context.Investments.Remove(investment);
        return Task.CompletedTask;
    }
}
