using Planning.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace Planning.Infrastructure.Repositories;

internal sealed class PlanningUnitOfWork(PlanningDbContext context) : IPlanningUnitOfWork
{
    public async Task<bool> TrySaveGoalChangesAsync(CancellationToken cancellationToken = default)
    {
        try { await context.SaveChangesAsync(cancellationToken); return true; }
        catch (DbUpdateConcurrencyException) { context.ChangeTracker.Clear(); return false; }
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return context.SaveChangesAsync(cancellationToken);
    }
}
