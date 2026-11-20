namespace Ledger.Contracts;

public interface ILedgerFinancialDataReset
{
    Task ResetForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
