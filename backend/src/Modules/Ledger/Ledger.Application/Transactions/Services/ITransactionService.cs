using BuildingBlocks.Common;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Transactions.Services;

public sealed record RegisterTransactionRequest(
    Guid AccountId,
    decimal Amount,
    TransactionDirection Direction,
    Guid? CategoryId = null,
    DateTime? OccurredAt = null,
    string? Description = null,
    decimal? AppliedRate = null,
    string? RateSource = null);

public sealed record UpdateTransactionRequest(
    Guid AccountId,
    decimal Amount,
    TransactionDirection Direction,
    Guid? CategoryId = null,
    DateTime? OccurredAt = null,
    string? Description = null);

public sealed record RegisterTransferRequest(
    Guid SourceAccountId,
    decimal SourceAmount,
    Guid DestinationAccountId,
    decimal DestinationAmount,
    DateTime? OccurredAt = null,
    decimal? AppliedRate = null,
    string? RateSource = null,
    string? Description = null);

public sealed record ReverseTransactionRequest(string? Reason);

public sealed record TransactionDto(
    Guid Id,
    Guid AccountId,
    decimal Amount,
    string Currency,
    string Direction,
    Guid? CategoryId,
    DateTime OccurredAt,
    string? Description,
    Guid? ReversesId,
    Guid? TransferId,
    decimal? AppliedRate,
    string? RateSource,
    DateTime CreatedAt);

public sealed record TransferResult(Guid OutflowId, Guid InflowId);
public sealed record ReverseResult(Guid Id, Guid ReversedTransactionId);

public interface ITransactionService
{
    Task<Result<List<TransactionDto>>> GetTransactionsAsync(
        Guid? accountId = null,
        TransactionDirection? direction = null,
        DateTime? from = null,
        DateTime? to = null,
        int limit = 50,
        CancellationToken cancellationToken = default);

    Task<Result<Guid>> RegisterTransactionAsync(
        RegisterTransactionRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<TransferResult>> RegisterTransferAsync(
        RegisterTransferRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<ReverseResult>> ReverseTransactionAsync(
        Guid id,
        string? reason = null,
        CancellationToken cancellationToken = default);

    Task<Result<Guid>> UpdateTransactionAsync(
        Guid id,
        UpdateTransactionRequest request,
        CancellationToken cancellationToken = default);
}
