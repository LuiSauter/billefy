using Microsoft.EntityFrameworkCore;
using Planning.Application.Abstractions;
using Planning.Domain.Distribution;

namespace Planning.Infrastructure.Repositories;

internal sealed class DistributionPlanRepository(PlanningDbContext context) : IDistributionPlanRepository
{
    public Task<DistributionPlan?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        context.DistributionPlans
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

    public async Task AddAsync(DistributionPlan plan, CancellationToken cancellationToken = default) =>
        await context.DistributionPlans.AddAsync(plan, cancellationToken);
}
