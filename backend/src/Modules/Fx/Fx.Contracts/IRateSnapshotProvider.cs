namespace Fx.Contracts;

public interface IRateSnapshotProvider
{
    Task<RateSnapshotDto?> GetSnapshotAsync(
        string currencyCode,
        string baseCurrencyCode,
        Guid? userId = null,
        CancellationToken cancellationToken = default);

    Task<RateSnapshotDto?> GetSnapshotAsync(
        string currencyCode,
        string baseCurrencyCode,
        RateSide side,
        Guid? userId = null,
        CancellationToken cancellationToken = default) =>
        GetSnapshotAsync(currencyCode, baseCurrencyCode, userId, cancellationToken);
}
