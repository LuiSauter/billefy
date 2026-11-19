using BuildingBlocks.Common;
using Lending.Contracts;

namespace Lending.Application.Abstractions;

public interface ILoanPurchaseService
{
    Task<Result<Guid>> RegisterPurchaseAsync(Guid loanId, RegisterCardPurchaseRequest request,
        CancellationToken cancellationToken = default);
}
