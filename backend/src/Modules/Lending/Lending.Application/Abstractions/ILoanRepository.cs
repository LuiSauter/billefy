using Lending.Domain.Entities;
using Lending.Domain.Enums;

namespace Lending.Application.Abstractions;

public interface ILoanRepository
{
    Task<Loan?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<Loan>> GetByUserIdAsync(
        Guid userId,
        LoanType? type = null,
        LoanStatus? status = null,
        CancellationToken cancellationToken = default);
    Task AddAsync(Loan loan, CancellationToken cancellationToken = default);
    Task AddPaymentAsync(LoanPayment payment, CancellationToken cancellationToken = default);
    Task UpdateAsync(Loan loan, CancellationToken cancellationToken = default);
}

public interface ICounterpartyRepository
{
    Task<Counterparty?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<Counterparty>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(Counterparty counterparty, CancellationToken cancellationToken = default);
}

public interface ILendingUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
