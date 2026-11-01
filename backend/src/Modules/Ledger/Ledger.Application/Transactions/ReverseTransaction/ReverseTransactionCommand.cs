using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Ledger.Application.Abstractions;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Transactions.ReverseTransaction;

public sealed record ReverseTransactionCommand(
    Guid TransactionId,
    string? Reason = null);

public sealed class ReverseTransactionCommandHandler
{
    private readonly ITransactionRepository _transactionRepository;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IClock _clock;
    private readonly IUnitOfWork _unitOfWork;

    public ReverseTransactionCommandHandler(
        ITransactionRepository transactionRepository,
        ICurrentUserContext currentUserContext,
        IClock clock,
        IUnitOfWork unitOfWork)
    {
        _transactionRepository = transactionRepository;
        _currentUserContext = currentUserContext;
        _clock = clock;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> HandleAsync(ReverseTransactionCommand command, CancellationToken cancellationToken = default)
    {
        if (!_currentUserContext.IsAuthenticated)
        {
            return Result.Failure<Guid>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var original = await _transactionRepository.GetByIdAsync(command.TransactionId, cancellationToken);
        if (original is null)
        {
            var transferLegs = await _transactionRepository.GetTransferLegsAsync(_currentUserContext.UserId!.Value, command.TransactionId, cancellationToken);
            if (transferLegs.Count == 2) original = transferLegs.Single(leg => leg.Direction == TransactionDirection.Expense);
        }
        if (original is null || original.UserId != _currentUserContext.UserId!.Value)
        {
            return Result.Failure<Guid>(Error.NotFound("Transaction.NotFound", "Transaction not found."));
        }

        if (original.InvestmentId.HasValue)
            return Result.Failure<Guid>(Error.Conflict("InvestmentCash.RequiresCoordinatedReverse", "Investment cash movements must be reversed through the investment endpoint."));

        if (original.ReversesId.HasValue)
        {
            return Result.Failure<Guid>(Error.Conflict("Transaction.ReversalCannotBeReversed", "A reversal cannot be reversed."));
        }

        if (original.TransferId is Guid transferId)
        {
            var legs = await _transactionRepository.GetTransferLegsAsync(original.UserId, transferId, cancellationToken);
            if (legs.Count != 2 || legs.Any(leg => leg.ReversesId.HasValue) ||
                legs.Count(leg => leg.Direction == TransactionDirection.Expense) != 1 ||
                legs.Count(leg => leg.Direction == TransactionDirection.Income) != 1)
                return Result.Failure<Guid>(Error.Conflict("Transfer.InvalidPair", "The transfer pair cannot be reversed."));
            if (await _transactionRepository.GetReversalByOriginalIdAsync(legs[0].Id, cancellationToken) is not null ||
                await _transactionRepository.GetReversalByOriginalIdAsync(legs[1].Id, cancellationToken) is not null)
                return Result.Failure<Guid>(Error.Conflict("Transaction.AlreadyReversed", "Transfer already has a reversal."));

            var outflow = legs.Single(leg => leg.Direction == TransactionDirection.Expense);
            var inflow = legs.Single(leg => leg.Direction == TransactionDirection.Income);
            var (reversedOutflow, reversedInflow) = Transaction.CreateTransferReversal(
                outflow, inflow, _clock.UtcNow, command.Reason, _clock.UtcNow);
            await _transactionRepository.AddRangeAsync([reversedOutflow, reversedInflow], cancellationToken);
            try
            {
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch
            {
                if (await _transactionRepository.GetReversalByOriginalIdAsync(outflow.Id, cancellationToken) is not null ||
                    await _transactionRepository.GetReversalByOriginalIdAsync(inflow.Id, cancellationToken) is not null)
                    return Result.Failure<Guid>(Error.Conflict("Transaction.AlreadyReversed", "Transfer already has a reversal."));
                throw;
            }
            return Result.Success(reversedOutflow.Id);
        }

        if (await _transactionRepository.GetReversalByOriginalIdAsync(original.Id, cancellationToken) is not null)
            return Result.Failure<Guid>(Error.Conflict("Transaction.AlreadyReversed", "Transaction already has a reversal."));

        var reversal = Transaction.CreateReversal(original, _clock.UtcNow, command.Reason, _clock.UtcNow);
        await _transactionRepository.AddAsync(reversal, cancellationToken);
        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            if (await _transactionRepository.GetReversalByOriginalIdAsync(original.Id, cancellationToken) is not null)
                return Result.Failure<Guid>(Error.Conflict("Transaction.AlreadyReversed", "Transaction already has a reversal."));
            throw;
        }

        return Result.Success(reversal.Id);
    }
}
