using Microsoft.EntityFrameworkCore;
using Planning.Application.Abstractions;
using Planning.Domain.Goals;

namespace Planning.Infrastructure.Repositories;

internal sealed class GoalRepository(PlanningDbContext context) : IGoalRepository
{
    public Task<Goal?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return context.Goals.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
    }

    public Task<List<Goal>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return context.Goals
            .IgnoreQueryFilters()
            .Where(g => g.UserId == userId)
            .OrderBy(g => g.TargetDate)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Goal goal, CancellationToken cancellationToken = default)
    {
        await context.Goals.AddAsync(goal, cancellationToken);
    }

    public Task UpdateAsync(Goal goal, CancellationToken cancellationToken = default)
    {
        context.Goals.Update(goal);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Goal goal, CancellationToken cancellationToken = default)
    {
        context.Goals.Remove(goal);
        return Task.CompletedTask;
    }
}
