using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.ValueObjects;
using Ledger.Application.Abstractions;
using Ledger.Application.Accounts.CreateAccount;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Accounts.Services;

public sealed class AccountService(
    IAccountRepository accountRepository,
    ITransactionRepository transactionRepository,
    IUnitOfWork unitOfWork,
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

    public Task<Result<List<AccountDto>>> GetAccountsAsync(CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Task.FromResult(Result.Failure<List<AccountDto>>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.")));
        }

        return GetAccountsByUserIdAsync(userContext.UserId!.Value, cancellationToken);
    }

    public async Task<Result<List<AccountDto>>> GetAccountsByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var accounts = await accountRepository.GetAllAsync(includeArchived: false, cancellationToken);
        var userAccounts = accounts.Where(a => a.UserId == userId).ToList();
        var dtos = new List<AccountDto>();

        foreach (var account in userAccounts)
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

    public async Task<Result<ReconciliationResult>> ReconcileAccountAsync(
        Guid accountId,
        ReconcileAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<ReconciliationResult>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var account = await accountRepository.GetByIdAsync(accountId, cancellationToken);
        if (account is null)
        {
            return Result.Failure<ReconciliationResult>(
                Error.NotFound("Account.NotFound", $"Account with id {accountId} was not found."));
        }

        var currentBalance = await transactionRepository.CalculateBalanceAsync(accountId, cancellationToken);
        var difference = request.RealBalance - currentBalance;

        if (difference == decimal.Zero)
        {
            return Result.Success(new ReconciliationResult(
                accountId,
                currentBalance,
                request.RealBalance,
                0m,
                null));
        }

        var direction = difference > decimal.Zero
            ? TransactionDirection.Income
            : TransactionDirection.Expense;

        var adjustmentAmount = Math.Abs(difference);
        var money = Money.Of(adjustmentAmount, account.Currency);

        var description = !string.IsNullOrWhiteSpace(request.Notes)
            ? $"Reconciliation adjustment: {request.Notes.Trim()}"
            : "Reconciliation balance adjustment";

        var transaction = Transaction.Create(
            userContext.UserId!.Value,
            accountId,
            money,
            direction,
            categoryId: null,
            DateTime.UtcNow,
            description);

        await transactionRepository.AddAsync(transaction, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(new ReconciliationResult(
            accountId,
            currentBalance,
            request.RealBalance,
            difference,
            transaction.Id));
    }
}
