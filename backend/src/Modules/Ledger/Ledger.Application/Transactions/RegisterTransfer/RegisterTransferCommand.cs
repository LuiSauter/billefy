using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Ledger.Application.Abstractions;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Transactions.RegisterTransfer;

public sealed record RegisterTransferCommand(
    Guid SourceAccountId,
    decimal SourceAmount,
    Guid DestinationAccountId,
    decimal DestinationAmount,
    DateTime OccurredAt,
    decimal? AppliedRate,
    string? RateSource,
    string? Description);

public sealed class RegisterTransferCommandHandler
{
    private readonly IAccountRepository _accountRepository;
    private readonly ITransactionRepository _transactionRepository;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IClock _clock;
    private readonly IUnitOfWork _unitOfWork;

    public RegisterTransferCommandHandler(
        IAccountRepository accountRepository,
        ITransactionRepository transactionRepository,
        ICurrentUserContext currentUserContext,
        IClock clock,
        IUnitOfWork unitOfWork)
    {
        _accountRepository = accountRepository;
        _transactionRepository = transactionRepository;
        _currentUserContext = currentUserContext;
        _clock = clock;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<(Guid OutflowId, Guid InflowId)>> HandleAsync(RegisterTransferCommand command, CancellationToken cancellationToken = default)
    {
        if (!_currentUserContext.IsAuthenticated)
        {
            return Result.Failure<(Guid, Guid)>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (command.SourceAccountId == command.DestinationAccountId)
        {
            return Result.Failure<(Guid, Guid)>(Error.Validation("Transfer.SameAccount", "Source and destination accounts must be distinct."));
        }

        if (command.SourceAmount <= decimal.Zero || command.DestinationAmount <= decimal.Zero)
        {
            return Result.Failure<(Guid, Guid)>(Error.Validation("Transfer.InvalidAmount", "Transfer amounts must be strictly greater than zero."));
        }

        var sourceAccount = await _accountRepository.GetByIdAsync(command.SourceAccountId, cancellationToken);
        if (sourceAccount is null)
        {
            return Result.Failure<(Guid, Guid)>(Error.NotFound("Account.SourceNotFound", "Source account was not found."));
        }

        var destAccount = await _accountRepository.GetByIdAsync(command.DestinationAccountId, cancellationToken);
        if (destAccount is null)
        {
            return Result.Failure<(Guid, Guid)>(Error.NotFound("Account.DestinationNotFound", "Destination account was not found."));
        }

        var sourceMoney = Money.Of(command.SourceAmount, sourceAccount.Currency);
        var destMoney = Money.Of(command.DestinationAmount, destAccount.Currency);

        var (outflow, inflow) = Transaction.CreateTransfer(
            _currentUserContext.UserId!.Value,
            command.SourceAccountId,
            sourceMoney,
            command.DestinationAccountId,
            destMoney,
            command.OccurredAt,
            command.AppliedRate,
            command.RateSource,
            command.Description,
            _clock.UtcNow);

        await _transactionRepository.AddRangeAsync([outflow, inflow], cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success((outflow.Id, inflow.Id));
    }
}
