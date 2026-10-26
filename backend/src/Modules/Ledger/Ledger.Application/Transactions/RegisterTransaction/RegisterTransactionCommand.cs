using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Ledger.Application.Abstractions;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Transactions.RegisterTransaction;

public sealed record RegisterTransactionCommand(
    Guid AccountId,
    decimal Amount,
    TransactionDirection Direction,
    Guid? CategoryId,
    DateTime OccurredAt,
    string? Description,
    decimal? AppliedRate = null,
    string? RateSource = null);

public sealed class RegisterTransactionCommandHandler
{
    private readonly IAccountRepository _accountRepository;
    private readonly ITransactionRepository _transactionRepository;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IClock _clock;
    private readonly IUnitOfWork _unitOfWork;

    public RegisterTransactionCommandHandler(
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

    public async Task<Result<Guid>> HandleAsync(RegisterTransactionCommand command, CancellationToken cancellationToken = default)
    {
        if (!_currentUserContext.IsAuthenticated)
        {
            return Result.Failure<Guid>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (command.Amount <= decimal.Zero)
        {
            return Result.Failure<Guid>(Error.Validation("Transaction.InvalidAmount", "Amount must be strictly greater than zero."));
        }

        var account = await _accountRepository.GetByIdAsync(command.AccountId, cancellationToken);
        if (account is null)
        {
            return Result.Failure<Guid>(Error.NotFound("Account.NotFound", $"Account with id {command.AccountId} was not found."));
        }

        var money = Money.Of(command.Amount, account.Currency);

        var transaction = Transaction.Create(
            _currentUserContext.UserId!.Value,
            command.AccountId,
            money,
            command.Direction,
            command.CategoryId,
            command.OccurredAt,
            command.Description,
            command.AppliedRate,
            command.RateSource,
            _clock.UtcNow);

        await _transactionRepository.AddAsync(transaction, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(transaction.Id);
    }
}
