using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Planning.Contracts;

namespace Planning.Infrastructure;

public sealed class PlanningFinancialDataExport(PlanningDbContext db) : IPlanningFinancialDataExport
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };

    public async Task<JsonElement> ExportForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var budgets = await db.Budgets.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var goals = await db.Goals.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var goalFundingEntries = await db.GoalFundingEntries.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var goalFundingAccounts = await db.GoalFundingAccounts.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var investments = await db.Investments.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var investmentTransactions = await db.InvestmentTransactions.AsNoTracking()
            .Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var investmentCashLinks = await db.InvestmentCashLinks.AsNoTracking()
            .Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var distributionPlans = await db.DistributionPlans.AsNoTracking()
            .Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var recurringPayments = await db.RecurringPayments.AsNoTracking()
            .Where(x => x.UserId == userId).ToListAsync(cancellationToken);

        return JsonSerializer.SerializeToElement(
            new { budgets, goals, goalFundingEntries, goalFundingAccounts, investments, investmentTransactions, investmentCashLinks, distributionPlans, recurringPayments }, JsonOptions);
    }
}
