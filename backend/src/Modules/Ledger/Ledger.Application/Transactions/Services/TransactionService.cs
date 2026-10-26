using BuildingBlocks.Common;
using BuildingBlocks.Security;
using Ledger.Application.Abstractions;
using Ledger.Application.Transactions.RegisterTransaction;
using Ledger.Application.Transactions.RegisterTransfer;
using Ledger.Application.Transactions.ReverseTransaction;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Transactions.Services;

public sealed class TransactionService(
    ITransactionRepository transactionRepository,
    RegisterTransactionCommandHandler registerHandler,
    RegisterTransferCommandHandler transferHandler,
    ReverseTransactionCommandHandler reverseHandler,
    ICurrentUserContext userContext) : ITransactionService
{
    public async Task<Result<List<TransactionDto>>> GetTransactionsAsync(
        Guid? accountId = null,
        TransactionDirection? direction = null,
        DateTime? from = null,
        DateTime? to = null,
        int limit = 50,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<List<TransactionDto>>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var txns = await transactionRepository.GetFilteredAsync(
            accountId,
            direction,
            from,
            to,
            limit,
            cancellationToken);

        var dtos = txns.Select(t => new TransactionDto(
            t.Id,
            t.AccountId,
            t.Amount.Amount,
            t.Amount.Currency.Code,
            t.Direction.ToString(),
            t.CategoryId,
            t.OccurredAt,
            t.Description,
            t.ReversesId,
            t.TransferId,
            t.AppliedRate,
            t.RateSource,
            t.CreatedAt)).ToList();

        return Result.Success(dtos);
    }

    public Task<Result<Guid>> RegisterTransactionAsync(
        RegisterTransactionRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new RegisterTransactionCommand(
            request.AccountId,
            request.Amount,
            request.Direction,
            request.CategoryId,
            request.OccurredAt ?? DateTime.UtcNow,
            request.Description,
            request.AppliedRate,
            request.RateSource);

        return registerHandler.HandleAsync(command, cancellationToken);
    }

    public async Task<Result<TransferResult>> RegisterTransferAsync(
        RegisterTransferRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new RegisterTransferCommand(
            request.SourceAccountId,
            request.SourceAmount,
            request.DestinationAccountId,
            request.DestinationAmount,
            request.OccurredAt ?? DateTime.UtcNow,
            request.AppliedRate,
            request.RateSource,
            request.Description);

        var result = await transferHandler.HandleAsync(command, cancellationToken);
        if (result.IsFailure)
        {
            return Result.Failure<TransferResult>(result.Error);
        }

        return Result.Success(new TransferResult(result.Value.OutflowId, result.Value.InflowId));
    }

    public async Task<Result<ReverseResult>> ReverseTransactionAsync(
        Guid id,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        var command = new ReverseTransactionCommand(id, reason);
        var result = await reverseHandler.HandleAsync(command, cancellationToken);
        if (result.IsFailure)
        {
            return Result.Failure<ReverseResult>(result.Error);
        }

        return Result.Success(new ReverseResult(result.Value, id));
    }
}
