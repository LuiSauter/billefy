using BuildingBlocks.Common;
using Ledger.Domain.Accounts;

namespace Ledger.Application.Accounts.Services;

public sealed record CreateAccountRequest(
    string Name,
    AccountType Type,
    string Currency,
    decimal InitialBalance = 0m);

public sealed record AccountDto(
    Guid Id,
    string Name,
    string Type,
    string Currency,
    decimal Balance,
    DateTime CreatedAt);

public sealed record ReconcileAccountRequest(
    decimal RealBalance,
    string? Notes = null);

public sealed record ReconciliationResult(
    Guid AccountId,
    decimal PreviousBalance,
    decimal RealBalance,
    decimal Difference,
    Guid? AdjustmentTransactionId);

public interface IAccountService
{
    Task<Result<Guid>> CreateAccountAsync(CreateAccountRequest request, CancellationToken cancellationToken = default);
    Task<Result<List<AccountDto>>> GetAccountsAsync(CancellationToken cancellationToken = default);
    Task<Result<ReconciliationResult>> ReconcileAccountAsync(
        Guid accountId,
        ReconcileAccountRequest request,
        CancellationToken cancellationToken = default);
}
