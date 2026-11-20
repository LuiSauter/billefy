using BuildingBlocks.Common;
using BuildingBlocks.Security;
using Lending.Contracts;

namespace Planning.Application.Services;

public sealed record ProposeIncomeDistributionRequest(
    decimal IncomeAmount,
    string Currency = "BOB");

public sealed record IncomeDistributionProposal(
    decimal TotalIncome,
    string Currency,
    decimal NeedsAmount,
    decimal WantsAmount,
    decimal DebtPaymentAmount,
    decimal SavingsAmount,
    decimal NeedsPercentage,
    decimal WantsPercentage,
    decimal DebtPercentage,
    decimal SavingsPercentage,
    string Rationale);

public interface IIncomeDistributionService
{
    Task<Result<IncomeDistributionProposal>> ProposeDistributionAsync(
        ProposeIncomeDistributionRequest request,
        CancellationToken cancellationToken = default);
}

public sealed class IncomeDistributionService(
    ILendingModule lendingModule,
    ICurrentUserContext userContext) : IIncomeDistributionService
{
    public async Task<Result<IncomeDistributionProposal>> ProposeDistributionAsync(
        ProposeIncomeDistributionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.IncomeAmount <= decimal.Zero)
        {
            return Result.Failure<IncomeDistributionProposal>(
                Error.Validation("Distribution.InvalidIncome", "Income amount must be positive."));
        }

        var total = request.IncomeAmount;
        var debts = userContext.IsAuthenticated
            ? await lendingModule.GetTotalDebtLiabilitiesAsync(userContext.UserId!.Value, cancellationToken)
            : decimal.Zero;

        decimal needsPct = 50m;
        decimal wantsPct = 30m;
        decimal debtPct = decimal.Zero;
        decimal savingsPct = 20m;
        string rationale;

        if (debts > decimal.Zero)
        {
            // If user carries debt, allocate 15% toward debt reduction, taking 10% from wants and 5% from savings
            wantsPct = 20m;
            debtPct = 15m;
            savingsPct = 15m;
            rationale = $"Se detectaron pasivos activos por {debts:F2} {request.Currency}. Se propone destinar un 15% a amortizar deuda (50% Necesidades, 20% Deseos, 15% Deuda, 15% Ahorro).";
        }
        else
        {
            rationale = "Sin deudas activas detectadas. Se aplica la distribución clásica 50/30/20 (50% Necesidades, 30% Deseos, 20% Ahorro e Inversión).";
        }

        var needsAmount = Math.Round(total * (needsPct / 100m), 2);
        var wantsAmount = Math.Round(total * (wantsPct / 100m), 2);
        var debtAmount = Math.Round(total * (debtPct / 100m), 2);
        var savingsAmount = Math.Round(total * (savingsPct / 100m), 2);

        return Result.Success(new IncomeDistributionProposal(
            TotalIncome: total,
            Currency: request.Currency,
            NeedsAmount: needsAmount,
            WantsAmount: wantsAmount,
            DebtPaymentAmount: debtAmount,
            SavingsAmount: savingsAmount,
            NeedsPercentage: needsPct,
            WantsPercentage: wantsPct,
            DebtPercentage: debtPct,
            SavingsPercentage: savingsPct,
            Rationale: rationale));
    }
}
