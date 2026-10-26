using BuildingBlocks.Common;
using BuildingBlocks.Security;
using Ledger.Application.Abstractions;
using Ledger.Application.Accounts.CreateAccount;

namespace Ledger.Application.Accounts.Services;

public sealed class AccountService(
    IAccountRepository accountRepository,
    ITransactionRepository transactionRepository,
    CreateAccountCommandHandler createAccountHandler,
    ICurrentUserContext userContext) : IAccountService
{
    public Task<Result<Guid>> CreateAccountAsync(CreateAccountRequest request, CancellationToken cancellationToken = default)
    {
        var command = new CreateAccountCommand(
            request.Name,
            request.Type,
            request.Currency,
            request.InitialBalance);

        return createAccountHandler.HandleAsync(command, cancellationToken);
    }

    public async Task<Result<List<AccountDto>>> GetAccountsAsync(CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<List<AccountDto>>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var accounts = await accountRepository.GetAllAsync(includeArchived: false, cancellationToken);
        var dtos = new List<AccountDto>();

        foreach (var account in accounts)
        {
            var balance = await transactionRepository.CalculateBalanceAsync(account.Id, cancellationToken);
            dtos.Add(new AccountDto(
                account.Id,
                account.Name,
                account.Type.ToString(),
                account.Currency.Code,
                balance,
                account.CreatedAt));
        }

        return Result.Success(dtos);
    }
}
