using BuildingBlocks.Common;
using Lending.Contracts;

namespace Lending.Application.Services;

public interface ILoanService
{
    Task<Result<Guid>> CreateLoanAsync(CreateLoanRequest request, CancellationToken cancellationToken = default);
    Task<Result<List<LoanSummaryDto>>> GetLoansAsync(string? type = null, string? status = null, CancellationToken cancellationToken = default);
    Task<Result<LoanDetailDto>> GetLoanByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<LoanCancellationResultDto>> CancelLoanAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<LoanPaymentResultDto>> RegisterPaymentAsync(Guid loanId, RegisterLoanPaymentRequest request, CancellationToken cancellationToken = default);
}
