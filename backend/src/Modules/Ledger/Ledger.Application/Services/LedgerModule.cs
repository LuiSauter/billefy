using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Fx.Contracts;
using Ledger.Application.Abstractions;
using Ledger.Application.Categories.Services;
using Ledger.Contracts;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Services;

public sealed class LedgerModule : ILedgerModule
{
    private readonly IAccountRepository _accountRepository;
    private readonly ITransactionRepository _transactionRepository;
    private readonly ICategoryService _categoryService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;
    private readonly IRateSnapshotProvider? _rateSnapshotProvider;

    public LedgerModule(
        IAccountRepository accountRepository,
        ITransactionRepository transactionRepository,
        ICategoryService categoryService,
        IUnitOfWork unitOfWork,
        IClock clock,
        IRateSnapshotProvider? rateSnapshotProvider = null)
    {
        _accountRepository = accountRepository;
        _transactionRepository = transactionRepository;
        _categoryService = categoryService;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _rateSnapshotProvider = rateSnapshotProvider;
    }

    public async Task<IReadOnlyList<Guid>> GetExpenseCategoryIdsForCurrentUserAsync(
        CancellationToken cancellationToken = default)
    {
        var categories = await _categoryService.GetCategoriesAsync(TransactionDirection.Expense, cancellationToken);
        return categories.IsSuccess ? categories.Value.Select(c => c.Id).ToArray() : [];
    }

    public async Task<Guid> CreateTransactionFromDraftAsync(
        CreateTransactionFromDraftDto dto,
        CancellationToken cancellationToken = default)
    {
        var account = await _accountRepository.GetByIdForUserAsync(dto.UserId, dto.AccountId, cancellationToken)
            ?? throw new InvalidOperationException($"Account {dto.AccountId} does not exist or does not belong to the user.");

        var direction = Enum.TryParse<TransactionDirection>(dto.Direction, ignoreCase: true, out var parsedDir)
            ? parsedDir
            : TransactionDirection.Expense;

        decimal? appliedRate = null;
        string? rateSource = null;

        if (_rateSnapshotProvider is not null && account.Currency.Code != "USD")
        {
            var snapshot = await _rateSnapshotProvider.GetSnapshotAsync(
                account.Currency.Code,
                "USD",
                dto.UserId,
                cancellationToken);

            if (snapshot is not null)
            {
                appliedRate = snapshot.AppliedRate;
                rateSource = snapshot.RateSource;
            }
        }

        var money = Money.Of(dto.Amount, account.Currency);

        var description = string.IsNullOrWhiteSpace(dto.Description)
            ? (!string.IsNullOrWhiteSpace(dto.Reference) ? $"Ref: {dto.Reference}" : "Draft confirmed")
            : dto.Description.Trim();

        var transaction = Transaction.Create(
            dto.UserId,
            dto.AccountId,
            money,
            direction,
            dto.CategoryId,
            dto.OccurredAt,
            description,
            appliedRate,
            rateSource,
            _clock.UtcNow);

        await _transactionRepository.AddAsync(transaction, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return transaction.Id;
    }

    public async Task<LoanDisbursementReversalResultDto> ValidateLoanDisbursementReversalAsync(
        LoanDisbursementReversalRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var original = await _transactionRepository.GetByIdAsync(request.TransactionId, cancellationToken);
        if (original is null || original.UserId != request.UserId)
            return new(null, "Loan.DisbursementNotFound");

        var expectedDirection = Enum.TryParse<TransactionDirection>(request.ExpectedDirection, true, out var direction)
            ? direction
            : (TransactionDirection?)null;
        if (original.AccountId != request.AccountId || original.Amount.Amount != request.Principal ||
            !StringComparer.Ordinal.Equals(original.Amount.Currency.Code, request.Currency) ||
            original.Direction != expectedDirection || original.ReversesId.HasValue || original.TransferId.HasValue)
        {
            return new(null, "Loan.DisbursementMismatch");
        }

        if (await _transactionRepository.GetReversalByOriginalIdAsync(original.Id, cancellationToken) is not null)
            return new(null, "Loan.DisbursementAlreadyReversed");

        return new(null, null);
    }

    public async Task<LoanDisbursementReversalResultDto> ReverseLoanDisbursementAsync(
        LoanDisbursementReversalRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var validation = await ValidateLoanDisbursementReversalAsync(request, cancellationToken);
        if (validation.ErrorCode is not null)
            return validation;
        var original = await _transactionRepository.GetByIdAsync(request.TransactionId, cancellationToken);
        if (original is null)
            return new(null, "Loan.DisbursementNotFound");
        var reversal = Transaction.CreateReversal(original, _clock.UtcNow, "Loan cancellation", _clock.UtcNow);
        await _transactionRepository.AddAsync(reversal, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new(reversal.Id, null);
    }

    public async Task<IReadOnlyList<LedgerCurrencyHealthMetricsDto>> GetMonthlyHealthMetricsAsync(
        Guid userId,
        DateTime monthStartUtc,
        DateTime monthEndUtcExclusive,
        CancellationToken cancellationToken = default)
    {
        var totals = await _transactionRepository.GetMonthlyActivityByCurrencyAsync(
            userId, monthStartUtc, monthEndUtcExclusive, cancellationToken);
        var metrics = new Dictionary<string, (decimal Income, decimal Expenses, decimal Balance)>(StringComparer.Ordinal);

        foreach (var total in totals)
        {
            var current = metrics.GetValueOrDefault(total.Currency);
            metrics[total.Currency] = (
                current.Income + total.Income,
                current.Expenses + total.Expenses,
                current.Balance);
        }

        var accounts = await _accountRepository.GetByUserIdAsync(userId, includeArchived: false, cancellationToken);
        foreach (var account in accounts)
        {
            var balance = await _transactionRepository.CalculateBalanceAsync(account.Id, cancellationToken);
            var current = metrics.GetValueOrDefault(account.Currency.Code);
            metrics[account.Currency.Code] = (current.Income, current.Expenses, current.Balance + balance);
        }

        return metrics.OrderBy(pair => pair.Key, StringComparer.Ordinal)
            .Select(pair => new LedgerCurrencyHealthMetricsDto(
                pair.Key, pair.Value.Income, pair.Value.Expenses, pair.Value.Balance))
            .ToArray();
    }

    public async Task<MonthlyLedgerMetricsDto> GetMonthlyMetricsAsync(
        Guid userId,
        DateTime monthStart,
        DateTime monthEnd,
        CancellationToken cancellationToken = default)
    {
        var txns = await _transactionRepository.GetFilteredAsync(
            userId: userId,
            accountId: null,
            direction: null,
            from: monthStart,
            to: monthEnd,
            limit: 1000,
            cancellationToken: cancellationToken);

        decimal totalIncome = decimal.Zero;
        decimal totalExpense = decimal.Zero;
        var categoryMap = new Dictionary<Guid, decimal>();

        foreach (var t in txns)
        {
            // Internal movements are neither income nor spending, even when categorized.
            if (t.TransferId.HasValue) continue;

            if (t.Direction == TransactionDirection.Income)
            {
                totalIncome += t.Amount.Amount;
            }
            else
            {
                totalExpense += t.Amount.Amount;
                if (t.CategoryId.HasValue)
                {
                    categoryMap[t.CategoryId.Value] = categoryMap.GetValueOrDefault(t.CategoryId.Value) + t.Amount.Amount;
                }
            }
        }

        var accounts = await _accountRepository.GetByUserIdAsync(userId, includeArchived: false, cancellationToken);
        decimal totalLiquid = decimal.Zero;
        foreach (var acc in accounts)
        {
            var bal = await _transactionRepository.CalculateBalanceAsync(acc.Id, cancellationToken);
            totalLiquid += bal;
        }

        return new MonthlyLedgerMetricsDto(totalIncome, totalExpense, totalLiquid, categoryMap);
    }

    public Task<decimal> GetAccountBalanceAsync(Guid accountId, CancellationToken cancellationToken = default)
    {
        return _transactionRepository.CalculateBalanceAsync(accountId, cancellationToken);
    }

    public async Task<IReadOnlyList<LedgerAccountSummaryDto>> GetAccountsByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var accounts = await _accountRepository.GetByUserIdAsync(userId, includeArchived: false, cancellationToken);
        var dtos = new List<LedgerAccountSummaryDto>();

        foreach (var account in accounts)
        {
            var balance = await _transactionRepository.CalculateBalanceAsync(account.Id, cancellationToken);
            dtos.Add(new LedgerAccountSummaryDto(
                account.Id,
                account.Name,
                account.Type.ToString(),
                account.Currency.Code,
                balance,
                account.CreatedAt));
        }

        return dtos;
    }
}
