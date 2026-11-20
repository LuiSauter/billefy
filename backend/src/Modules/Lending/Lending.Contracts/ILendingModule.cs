namespace Lending.Contracts;

public sealed record DebtLiabilityByCurrencyDto(string Currency, decimal OutstandingPrincipal);

public interface ILendingModule
{
    Task<decimal> GetTotalDebtLiabilitiesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DebtLiabilityByCurrencyDto>> GetDebtLiabilitiesByCurrencyAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}
