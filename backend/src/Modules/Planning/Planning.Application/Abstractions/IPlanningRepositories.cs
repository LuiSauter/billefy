using Planning.Domain.Budgets;
using Planning.Domain.Goals;

namespace Planning.Application.Abstractions;

public interface IBudgetRepository
{
    Task<Budget?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<Budget>> GetByUserIdAsync(Guid userId, bool onlyActive = true, CancellationToken cancellationToken = default);
    Task AddAsync(Budget budget, CancellationToken cancellationToken = default);
    Task UpdateAsync(Budget budget, CancellationToken cancellationToken = default);
    Task DeleteAsync(Budget budget, CancellationToken cancellationToken = default);
}

public interface IGoalRepository
{
    Task<Goal?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<Goal>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(Goal goal, CancellationToken cancellationToken = default);
    Task UpdateAsync(Goal goal, CancellationToken cancellationToken = default);
    Task DeleteAsync(Goal goal, CancellationToken cancellationToken = default);
}

public interface IPlanningUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface IInvestmentRepository
{
    Task<Planning.Domain.Investments.Investment?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<Planning.Domain.Investments.Investment>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(Planning.Domain.Investments.Investment investment, CancellationToken cancellationToken = default);
    Task DeleteAsync(Planning.Domain.Investments.Investment investment, CancellationToken cancellationToken = default);
}

public interface IDistributionPlanRepository
{
    Task<Planning.Domain.Distribution.DistributionPlan?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(Planning.Domain.Distribution.DistributionPlan plan, CancellationToken cancellationToken = default);
}
