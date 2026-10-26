namespace Lending.Contracts;

public interface ILendingModule
{
    Task<decimal> GetTotalDebtLiabilitiesAsync(Guid userId, CancellationToken cancellationToken = default);
}
