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
            return Result.Failure<Guid>(Error.NotFound("Transaction.NotFound", $"Transaction with id {command.TransactionId} was not found."));
        }

        var reversal = Transaction.CreateReversal(
            original,
            _clock.UtcNow,
            command.Reason,
            _clock.UtcNow);

        await _transactionRepository.AddAsync(reversal, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(reversal.Id);
    }
}
