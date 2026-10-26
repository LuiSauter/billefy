using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Fx.Contracts;
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
    private readonly IRateSnapshotProvider? _rateSnapshotProvider;

    public RegisterTransactionCommandHandler(
        IAccountRepository accountRepository,
        ITransactionRepository transactionRepository,
        ICurrentUserContext currentUserContext,
        IClock clock,
        IUnitOfWork unitOfWork,
        IRateSnapshotProvider? rateSnapshotProvider = null)
    {
        _accountRepository = accountRepository;
        _transactionRepository = transactionRepository;
        _currentUserContext = currentUserContext;
        _clock = clock;
        _unitOfWork = unitOfWork;
        _rateSnapshotProvider = rateSnapshotProvider;
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

        var appliedRate = command.AppliedRate;
        var rateSource = command.RateSource;

        // If rate is not explicitly provided, snapshot from Fx module contracts
        if (!appliedRate.HasValue && _rateSnapshotProvider is not null && account.Currency.Code != "USD")
        {
            var snapshot = await _rateSnapshotProvider.GetSnapshotAsync(
                account.Currency.Code,
                "USD",
                _currentUserContext.UserId,
                cancellationToken);

            if (snapshot is not null)
            {
                appliedRate = snapshot.AppliedRate;
                rateSource = snapshot.RateSource;
            }
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
            appliedRate,
            rateSource,
            _clock.UtcNow);

        await _transactionRepository.AddAsync(transaction, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(transaction.Id);
    }
}
