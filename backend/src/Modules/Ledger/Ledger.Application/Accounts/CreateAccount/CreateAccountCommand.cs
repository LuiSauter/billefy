using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Ledger.Application.Abstractions;
using Ledger.Domain.Accounts;

namespace Ledger.Application.Accounts.CreateAccount;

public sealed record CreateAccountCommand(
    string Name,
    AccountType Type,
    string CurrencyCode,
    decimal InitialBalanceAmount = 0m);

public sealed class CreateAccountCommandHandler
{
    private readonly IAccountRepository _accountRepository;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IClock _clock;
    private readonly IUnitOfWork _unitOfWork;

    public CreateAccountCommandHandler(
        IAccountRepository accountRepository,
        ICurrentUserContext currentUserContext,
        IClock clock,
        IUnitOfWork unitOfWork)
    {
        _accountRepository = accountRepository;
        _currentUserContext = currentUserContext;
        _clock = clock;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> HandleAsync(CreateAccountCommand command, CancellationToken cancellationToken = default)
    {
        if (!_currentUserContext.IsAuthenticated)
        {
            return Result.Failure<Guid>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (string.IsNullOrWhiteSpace(command.Name))
        {
            return Result.Failure<Guid>(Error.Validation("Account.EmptyName", "Account name cannot be empty."));
        }

        var currency = Currency.FromCode(command.CurrencyCode);
        var initialBalance = Money.Of(command.InitialBalanceAmount, currency);

        var account = Account.Create(
            _currentUserContext.UserId!.Value,
            command.Name,
            command.Type,
            currency,
            initialBalance,
            _clock.UtcNow);

        await _accountRepository.AddAsync(account, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(account.Id);
    }
}
