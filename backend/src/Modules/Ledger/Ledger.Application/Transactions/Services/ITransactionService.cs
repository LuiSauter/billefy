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
    string? RateSource = null,
    IReadOnlyList<TransactionAllocationRequest>? Allocations = null);

public sealed record TransactionAllocationRequest(Guid CategoryId, decimal Amount);
public sealed record TransactionAllocationDto(Guid CategoryId, string? CategoryName, decimal Amount);

public sealed record UpdateTransactionRequest(
    Guid AccountId,
    decimal Amount,
    TransactionDirection Direction,
    Guid? CategoryId = null,
    DateTime? OccurredAt = null,
    string? Description = null,
    IReadOnlyList<TransactionAllocationRequest>? Allocations = null);

public sealed record CorrectTransferRequest(
    Guid SourceAccountId, decimal SourceAmount, Guid DestinationAccountId, decimal DestinationAmount,
    DateTime? OccurredAt = null, decimal? AppliedRate = null, string? RateSource = null, string? Description = null);

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
    DateTime CreatedAt,
    IReadOnlyList<TransactionAllocationDto>? Allocations = null,
    bool IsReconciliationAdjustment = false);

public enum MovementHistoryMode { Active, Audit }
public enum MovementKind { Income, Expense, Transfer, Investment, Adjustment }

public sealed record MovementQuery(
    DateTime? StartUtc = null, DateTime? EndUtcExclusive = null, Guid? AccountId = null,
    Guid? CategoryId = null, MovementKind? Type = null, string? Search = null,
    MovementHistoryMode Mode = MovementHistoryMode.Active, int Page = 1, int PageSize = 50);
public sealed record MovementLegDto(Guid Id, Guid AccountId, string AccountName, decimal Amount, string Currency, string Direction, decimal? AppliedRate, string? RateSource);
public sealed record MovementDto(
    Guid Id, string Kind, decimal Amount, string Currency, string Direction, DateTime OccurredAt,
    Guid AccountId, string AccountName, Guid? CategoryId, string? CategoryName, string? Description,
    decimal? AppliedRate, string? RateSource, bool IsReversal, Guid? ReversesId,
    IReadOnlyList<MovementLegDto> Legs,
    IReadOnlyList<TransactionAllocationDto> Allocations,
    Guid? InvestmentId = null, string? InvestmentCashKind = null, bool IsReconciliationAdjustment = false);
public sealed record MovementCurrencySummary(string Currency, decimal Income, decimal Expenses,
    decimal TransferOut = 0, decimal TransferIn = 0, decimal Contributions = 0, decimal Disposals = 0);
public sealed record MovementPage(IReadOnlyList<MovementDto> Items, int Page, int PageSize, int TotalCount,
    IReadOnlyList<MovementCurrencySummary> Summary);

public sealed record TransferResult(Guid OutflowId, Guid InflowId);
public sealed record ReverseResult(Guid Id, Guid ReversedTransactionId);

public interface ITransactionService
{
    Task<Result<MovementPage>> GetMovementsAsync(MovementQuery query, CancellationToken cancellationToken = default);
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

    Task<Result<TransferResult>> CorrectTransferAsync(Guid transferId, CorrectTransferRequest request, CancellationToken cancellationToken = default);

    Task<Result<ReverseResult>> ReverseTransactionAsync(
        Guid id,
        string? reason = null,
        CancellationToken cancellationToken = default);

    Task<Result<Guid>> UpdateTransactionAsync(
        Guid id,
        UpdateTransactionRequest request,
        CancellationToken cancellationToken = default);
}
