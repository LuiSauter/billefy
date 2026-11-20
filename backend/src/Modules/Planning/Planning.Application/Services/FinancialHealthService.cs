using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
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
        var monthStartUtc = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEndUtcExclusive = monthStartUtc.AddMonths(1);

        var ledgerMetrics = await ledgerModule.GetMonthlyHealthMetricsAsync(
            userId, monthStartUtc, monthEndUtcExclusive, cancellationToken);
        var debtByCurrency = await lendingModule.GetDebtLiabilitiesByCurrencyAsync(userId, cancellationToken);

        var currencies = new Dictionary<string, (decimal Income, decimal Expenses, decimal Balance, decimal Debt)>(StringComparer.Ordinal);
        foreach (var metric in ledgerMetrics)
        {
            currencies[metric.Currency] = (metric.MonthlyIncome, metric.MonthlyExpenses, metric.CurrentBalance, 0m);
        }

        foreach (var debt in debtByCurrency)
        {
            var current = currencies.GetValueOrDefault(debt.Currency);
            currencies[debt.Currency] = (current.Income, current.Expenses, current.Balance, debt.OutstandingPrincipal);
        }

        var rows = currencies.OrderBy(pair => pair.Key, StringComparer.Ordinal)
            .Select(pair =>
            {
                var currency = Currency.FromCode(pair.Key);
                var netCashFlow = Money.RoundToScale(pair.Value.Income - pair.Value.Expenses, currency.DecimalPlaces);
                decimal? savingsRate = pair.Value.Income > decimal.Zero
                    ? Math.Round(netCashFlow / pair.Value.Income * 100m, 2, MidpointRounding.AwayFromZero)
                    : null;

                return new FinancialHealthCurrencyDto(
                    pair.Key,
                    pair.Value.Income,
                    pair.Value.Expenses,
                    netCashFlow,
                    savingsRate,
                    pair.Value.Balance,
                    Money.RoundToScale(pair.Value.Debt, currency.DecimalPlaces));
            })
            .ToArray();

        return Result.Success(new FinancialHealthDto(monthStartUtc, monthEndUtcExclusive, rows));
    }
}
