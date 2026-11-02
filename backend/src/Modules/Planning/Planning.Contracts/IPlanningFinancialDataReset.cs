namespace Planning.Contracts;

public interface IPlanningFinancialDataReset
{
    Task ResetForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
