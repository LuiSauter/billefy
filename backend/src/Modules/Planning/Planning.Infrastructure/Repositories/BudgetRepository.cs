using Microsoft.EntityFrameworkCore;
using Planning.Application.Abstractions;
using Planning.Domain.Budgets;

namespace Planning.Infrastructure.Repositories;

internal sealed class BudgetRepository(PlanningDbContext context) : IBudgetRepository
{
    public Task<Budget?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return context.Budgets.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
    }

    public Task<List<Budget>> GetByUserIdAsync(Guid userId, bool onlyActive = true, CancellationToken cancellationToken = default)
    {
        var query = context.Budgets.Where(b => b.UserId == userId);
        if (onlyActive)
        {
            query = query.Where(b => b.IsActive);
        }

        return query.OrderByDescending(b => b.CreatedAt).ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Budget budget, CancellationToken cancellationToken = default)
    {
        await context.Budgets.AddAsync(budget, cancellationToken);
    }

    public Task UpdateAsync(Budget budget, CancellationToken cancellationToken = default)
    {
        context.Budgets.Update(budget);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Budget budget, CancellationToken cancellationToken = default)
    {
        context.Budgets.Remove(budget);
        return Task.CompletedTask;
    }
}
