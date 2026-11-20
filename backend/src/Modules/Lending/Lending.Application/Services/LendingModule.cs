using Lending.Application.Abstractions;
using Lending.Contracts;
using Lending.Domain.Enums;

namespace Lending.Application.Services;

public sealed class LendingModule(ILoanRepository loanRepository) : ILendingModule
{
    public async Task<IReadOnlyList<DebtLiabilityByCurrencyDto>> GetDebtLiabilitiesByCurrencyAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var loans = await loanRepository.GetByUserIdAsync(
            userId,
            type: LoanType.Borrowed,
            status: null,
            cancellationToken);

        return loans
            .Where(loan => loan.Status == LoanStatus.Active || loan.Status == LoanStatus.InArrears)
            .GroupBy(loan => loan.Principal.Currency.Code, StringComparer.Ordinal)
            .OrderBy(group => group.Key, StringComparer.Ordinal)
            .Select(group => new DebtLiabilityByCurrencyDto(
                group.Key,
                group.Sum(loan => loan.RemainingPrincipal)))
            .ToArray();
    }

    public async Task<decimal> GetTotalDebtLiabilitiesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var loans = await loanRepository.GetByUserIdAsync(
            userId,
            type: LoanType.Borrowed,
            status: null,
            cancellationToken);

        var activeDebts = loans.Where(l => l.Status == LoanStatus.Active || l.Status == LoanStatus.InArrears);
        return activeDebts.Sum(l => l.RemainingPrincipal);
    }
}
