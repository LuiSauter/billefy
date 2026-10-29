using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Ledger.Contracts;
using Lending.Contracts;
using Planning.Contracts;

namespace Planning.Application.Services;

public interface IFinancialHealthService
{
    Task<Result<FinancialHealthDto>> GetFinancialHealthAsync(CancellationToken cancellationToken = default);
}

public sealed class FinancialHealthService(
    ILedgerModule ledgerModule,
    ILendingModule lendingModule,
    ICurrentUserContext userContext,
    IClock clock) : IFinancialHealthService
{
    public async Task<Result<FinancialHealthDto>> GetFinancialHealthAsync(CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<FinancialHealthDto>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var userId = userContext.UserId!.Value;
        var now = clock.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1).AddTicks(-1);

        var ledgerMetrics = await ledgerModule.GetMonthlyMetricsAsync(userId, monthStart, monthEnd, cancellationToken);
        var debtLiabilities = await lendingModule.GetTotalDebtLiabilitiesAsync(userId, cancellationToken);

        var income = ledgerMetrics.TotalIncome;
        var expenses = ledgerMetrics.TotalExpense;
        var netSavings = Math.Max(decimal.Zero, income - expenses);

        var savingsRate = income > decimal.Zero
            ? Math.Round((netSavings / income) * 100m, 2)
            : decimal.Zero;

        var liquid = ledgerMetrics.TotalLiquidBalance;
        var emergencyFundMonths = expenses > decimal.Zero
            ? Math.Round(liquid / expenses, 2)
            : (liquid > decimal.Zero ? 12.00m : decimal.Zero);

        var split = new BudgetSplit503020Dto(
            MonthlyIncome: income,
            NeedsTarget: Math.Round(income * 0.50m, 2),
            WantsTarget: Math.Round(income * 0.30m, 2),
            SavingsTarget: Math.Round(income * 0.20m, 2));

        return Result.Success(new FinancialHealthDto(
            MonthlyIncome: income,
            MonthlyExpenses: expenses,
            NetSavings: netSavings,
            SavingsRate: savingsRate,
            TotalLiquidBalance: liquid,
            EmergencyFundMonths: emergencyFundMonths,
            TotalDebtLiabilities: debtLiabilities,
            Split503020: split));
    }
}
