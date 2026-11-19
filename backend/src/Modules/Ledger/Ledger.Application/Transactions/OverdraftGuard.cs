using BuildingBlocks.Common;
using Ledger.Application.Abstractions;
using Ledger.Domain.Accounts;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Transactions;

/// <summary>
/// Cash/Savings/Wallet/CryptoWallet/Exchange/International have no real-world overdraft
/// mechanism (you cannot have negative physical cash, and digital/crypto wallets have no
/// credit line), so an expense (ordinary or posted on behalf of another module, e.g. a loan
/// or card payment) that would leave them negative is rejected. Checking and Bank accounts
/// commonly support real overdraft and keep the existing TXN-03 behavior unchanged.
/// </summary>
public static class OverdraftGuard
{
    public static readonly IReadOnlySet<AccountType> RestrictedAccountTypes = new HashSet<AccountType>
    {
        AccountType.Cash, AccountType.Savings, AccountType.Wallet,
        AccountType.CryptoWallet, AccountType.Exchange, AccountType.International,
    };

    /// <summary>
    /// <paramref name="supersededAmount"/> excludes the amount of a transaction being replaced
    /// during an edit, so the still-active original is not double-counted against the projected
    /// balance (mirrors the transfer-correction projected-balance pattern in TransactionService).
    /// </summary>
    public static async Task<Result> CheckAsync(
        IAccountRepository accountRepository,
        ITransactionRepository transactionRepository,
        TransactionDirection direction,
        Guid accountId,
        decimal expenseAmount,
        CancellationToken cancellationToken,
        decimal supersededAmount = 0m)
    {
        if (direction != TransactionDirection.Expense) return Result.Success();
        var account = await accountRepository.GetByIdAsync(accountId, cancellationToken);
        if (account is null)
            return Result.Failure(Error.NotFound("Account.NotFound", "Account not found."));
        if (!RestrictedAccountTypes.Contains(account.Type))
            return Result.Success();
        var currentBalance = await transactionRepository.CalculateBalanceAsync(accountId, cancellationToken);
        var projectedBalance = currentBalance + supersededAmount;
        if (expenseAmount > projectedBalance)
            return Result.Failure(Error.Validation("Transaction.InsufficientFunds",
                "This account type does not support a negative balance; the expense exceeds the available funds."));
        return Result.Success();
    }
}
