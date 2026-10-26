namespace Fx.Contracts;

public interface IRateSnapshotProvider
{
    Task<RateSnapshotDto?> GetSnapshotAsync(
        string currencyCode,
        string baseCurrencyCode,
        Guid? userId = null,
        CancellationToken cancellationToken = default);
}
