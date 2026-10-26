using Lending.Application.Abstractions;
using Lending.Contracts;
using Lending.Domain.Enums;

namespace Lending.Application.Services;

public sealed class LendingModule(ILoanRepository loanRepository) : ILendingModule
{
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
