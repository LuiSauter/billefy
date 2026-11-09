using Microsoft.EntityFrameworkCore;
using Planning.Contracts;

namespace Planning.Infrastructure;

public sealed class PlanningFinancialDataReset(PlanningDbContext db) : IPlanningFinancialDataReset
{
    public async Task ResetForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Links and transactions restrict investment deletion and must be removed first.
        await db.InvestmentTransactions.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.InvestmentCashLinks.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Investments.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Budgets.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Goals.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.DistributionPlans.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
    }
}
