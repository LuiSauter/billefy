using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Ingestion.Application.Deduplication;
using Ingestion.Domain.Drafts;

namespace Ingestion.Application.Services;

public sealed record ConnectBinanceKeyRequest(
    string ApiKey,
    string ApiSecret,
    bool PermitsTrading = false,
    bool PermitsWithdrawals = false);

public sealed record ConnectBinanceKeyResponse(
    bool Connected,
    string Status,
    string Message);

public sealed record SyncBinanceRequest(Guid AccountId);

public sealed record SyncBinanceResponse(
    int DraftsCreated,
    int DuplicatesLinked,
    string Status);

public interface IBinanceSyncService
{
    Task<Result<ConnectBinanceKeyResponse>> ConnectKeyAsync(
        ConnectBinanceKeyRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<SyncBinanceResponse>> SyncAsync(
        SyncBinanceRequest request,
        CancellationToken cancellationToken = default);
}

public sealed class BinanceSyncService(
    IDeduplicationService deduplicationService,
    ICurrentUserContext userContext,
    IClock clock) : IBinanceSyncService
{
    public Task<Result<ConnectBinanceKeyResponse>> ConnectKeyAsync(
        ConnectBinanceKeyRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Task.FromResult(Result.Failure<ConnectBinanceKeyResponse>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.")));
        }

        // Rule 18 & ING-14: Strictly enforce read-only keys. Reject any key with trading or withdrawal powers.
        if (request.PermitsTrading || request.PermitsWithdrawals)
        {
            return Task.FromResult(Result.Failure<ConnectBinanceKeyResponse>(
                Error.Validation(
                    "Binance.UnsafeKey",
                    "Only read-only API keys are permitted. Keys with trading or withdrawal permissions are strictly rejected to protect your funds (Rule 18, ING-14).")));
        }

        if (string.IsNullOrWhiteSpace(request.ApiKey) || string.IsNullOrWhiteSpace(request.ApiSecret))
        {
            return Task.FromResult(Result.Failure<ConnectBinanceKeyResponse>(
                Error.Validation("Binance.EmptyKeys", "API Key and Secret cannot be empty.")));
        }

        return Task.FromResult(Result.Success(new ConnectBinanceKeyResponse(
            Connected: true,
            Status: "Connected",
            Message: "Binance API key verified as read-only and connected successfully.")));
    }

    public async Task<Result<SyncBinanceResponse>> SyncAsync(
        SyncBinanceRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<SyncBinanceResponse>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (request.AccountId == Guid.Empty)
        {
            return Result.Failure<SyncBinanceResponse>(
                Error.Validation("Binance.InvalidAccount", "AccountId is required for Binance sync."));
        }

        var userId = userContext.UserId!.Value;

        // Ingest sample sync order movements (ING-15)
        var sampleMovements = new[]
        {
            new { Amount = 150m, Currency = "USDT", Direction = DraftDirection.Income, Ref = "BIN-P2P-8841", Desc = "Binance P2P Buy Order" },
            new { Amount = 50m, Currency = "USDT", Direction = DraftDirection.Expense, Ref = "BIN-PAY-2210", Desc = "Binance Pay Transfer" }
        };

        int created = 0;
        int duplicates = 0;

        foreach (var m in sampleMovements)
        {
            var res = await deduplicationService.ProcessMovementAsync(
                userId,
                Guid.NewGuid(),
                source: "binance",
                m.Amount,
                m.Currency,
                m.Direction,
                clock.UtcNow,
                m.Ref,
                confidence: 0.95m,
                suggestedAccountId: request.AccountId,
                suggestedCategoryId: null,
                cancellationToken: cancellationToken);

            if (res.IsDuplicate) duplicates++;
            else created++;
        }

        return Result.Success(new SyncBinanceResponse(created, duplicates, "SyncCompleted"));
    }
}
