namespace Ingestion.Contracts;

public interface IIngestionFinancialDataReset
{
    Task ResetForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
