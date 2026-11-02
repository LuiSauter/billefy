using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Ledger.Application.Abstractions;
using Ledger.Domain.Accounts;
using Fx.Contracts;

namespace Ledger.Application.Accounts.CreateAccount;

public sealed record CreateAccountCommand(
    string Name,
    AccountType Type,
    string CurrencyCode,
    decimal InitialBalanceAmount = 0m,
    string? IconKey = null,
    string? ColorKey = null);

public sealed class CreateAccountCommandHandler
{
    private readonly IAccountRepository _accountRepository;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IClock _clock;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrencyCatalog _currencyCatalog;

    public CreateAccountCommandHandler(
        IAccountRepository accountRepository,
        ICurrentUserContext currentUserContext,
        IClock clock,
        IUnitOfWork unitOfWork,
        ICurrencyCatalog currencyCatalog)
    {
        _accountRepository = accountRepository;
        _currentUserContext = currentUserContext;
        _clock = clock;
        _unitOfWork = unitOfWork;
        _currencyCatalog = currencyCatalog;
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

        var currencyCode = command.CurrencyCode?.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(currencyCode) ||
            !await _currencyCatalog.IsActiveAsync(currencyCode, cancellationToken))
        {
            return Result.Failure<Guid>(Error.Validation("Account.UnsupportedCurrency", "Account currency is not available."));
        }

        var currency = Currency.FromCode(currencyCode);
        var initialBalance = Money.Of(command.InitialBalanceAmount, currency);

        var account = Account.Create(
            _currentUserContext.UserId!.Value,
            command.Name,
            command.Type,
            currency,
            initialBalance,
            _clock.UtcNow,
            command.IconKey,
            command.ColorKey);

        await _accountRepository.AddAsync(account, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(account.Id);
    }
}
