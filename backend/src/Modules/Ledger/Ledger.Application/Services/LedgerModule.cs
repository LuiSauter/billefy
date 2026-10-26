using BuildingBlocks.Currencies;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Fx.Contracts;
using Ledger.Application.Abstractions;
using Ledger.Contracts;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Services;

public sealed class LedgerModule : ILedgerModule
{
    private readonly IAccountRepository _accountRepository;
    private readonly ITransactionRepository _transactionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;
    private readonly IRateSnapshotProvider? _rateSnapshotProvider;

    public LedgerModule(
        IAccountRepository accountRepository,
        ITransactionRepository transactionRepository,
        IUnitOfWork unitOfWork,
        IClock clock,
        IRateSnapshotProvider? rateSnapshotProvider = null)
    {
        _accountRepository = accountRepository;
        _transactionRepository = transactionRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _rateSnapshotProvider = rateSnapshotProvider;
    }

    public async Task<Guid> CreateTransactionFromDraftAsync(
        CreateTransactionFromDraftDto dto,
        CancellationToken cancellationToken = default)
    {
        var account = await _accountRepository.GetByIdAsync(dto.AccountId, cancellationToken)
            ?? throw new InvalidOperationException($"Account {dto.AccountId} does not exist.");

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

    public async Task<MonthlyLedgerMetricsDto> GetMonthlyMetricsAsync(
        Guid userId,
        DateTime monthStart,
        DateTime monthEnd,
        CancellationToken cancellationToken = default)
    {
        var txns = await _transactionRepository.GetFilteredAsync(
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

        var accounts = await _accountRepository.GetAllAsync(includeArchived: false, cancellationToken);
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
}
