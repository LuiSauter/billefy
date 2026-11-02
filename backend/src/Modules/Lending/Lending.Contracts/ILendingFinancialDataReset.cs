namespace Lending.Contracts;

public interface ILendingFinancialDataReset
{
    Task ResetForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
