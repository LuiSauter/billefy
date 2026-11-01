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
        if (original is null || original.UserId != _currentUserContext.UserId!.Value)
        {
            return Result.Failure<Guid>(Error.NotFound("Transaction.NotFound", "Transaction not found."));
        }

        if (await _transactionRepository.GetReversalByOriginalIdAsync(original.Id, cancellationToken) is not null)
        {
            return Result.Failure<Guid>(Error.Conflict("Transaction.AlreadyReversed", "Transaction already has a reversal."));
        }

        var reversal = Transaction.CreateReversal(
            original,
            _clock.UtcNow,
            command.Reason,
            _clock.UtcNow);

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
