using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;

namespace Ledger.Domain.Transactions;

public sealed class Transaction : Entity
{
    private readonly List<TransactionCategoryAllocation> _categoryAllocations = [];
    public IReadOnlyCollection<TransactionCategoryAllocation> CategoryAllocations => _categoryAllocations.AsReadOnly();
    public Guid AccountId { get; private set; }
    public Money Amount { get; private set; }
    public TransactionDirection Direction { get; private set; }
    public Guid? CategoryId { get; private set; }
    public DateTime OccurredAt { get; private set; }
    public string? Description { get; private set; }
    public Guid? ReversesId { get; private set; }
    public Guid? TransferId { get; private set; }
    public decimal? AppliedRate { get; private set; }
    public string? RateSource { get; private set; }
    public Guid? WorkspaceSettlementId { get; private set; }
    public Guid? InvestmentId { get; private set; }
    public InvestmentCashKind? InvestmentCashKind { get; private set; }
    public bool IsReconciliationAdjustment { get; private set; }
    public Guid? LoanId { get; private set; }
    public LoanCashKind? LoanCashKind { get; private set; }

    // Required by EF Core
    private Transaction() : base()
    {
    }

    private Transaction(
        Guid id,
        Guid userId,
        Guid accountId,
        Money amount,
        TransactionDirection direction,
        Guid? categoryId,
        DateTime occurredAt,
        string? description,
        Guid? reversesId,
        Guid? transferId,
        decimal? appliedRate,
        string? rateSource,
        DateTime createdAt,
        IReadOnlyList<TransactionCategoryAllocationInput>? allocations = null,
        Guid? investmentId = null,
        InvestmentCashKind? investmentCashKind = null,
        bool isReconciliationAdjustment = false,
        Guid? workspaceSettlementId = null)
        : base(id, userId, createdAt)
    {
        if (accountId == Guid.Empty)
        {
            throw new ArgumentException("AccountId cannot be empty.", nameof(accountId));
        }

        if (amount.Amount <= decimal.Zero)
        {
            throw new ArgumentException("Transaction amount must be strictly greater than zero.", nameof(amount));
        }

        AccountId = accountId;
        Amount = amount;
        Direction = direction;
        CategoryId = categoryId;
        OccurredAt = occurredAt;
        Description = description?.Trim();
        ReversesId = reversesId;
        TransferId = transferId;
        AppliedRate = appliedRate;
        RateSource = rateSource?.Trim();
        if (investmentId.HasValue != investmentCashKind.HasValue || investmentId == Guid.Empty)
            throw new ArgumentException("Investment cash markers require both a valid investment ID and cash kind.");
        if (investmentId.HasValue && (transferId.HasValue || categoryId.HasValue || allocations is { Count: > 0 }))
            throw new ArgumentException("Investment cash transactions cannot be transfers or categorized.");
        if (isReconciliationAdjustment && (categoryId.HasValue || transferId.HasValue || investmentId.HasValue || allocations is { Count: > 0 }))
            throw new ArgumentException("Reconciliation adjustments cannot be transfers, investments, or categorized.");
        if (workspaceSettlementId == Guid.Empty || (workspaceSettlementId.HasValue &&
            (transferId.HasValue || investmentId.HasValue || isReconciliationAdjustment || categoryId.HasValue || allocations is { Count: > 0 })))
            throw new ArgumentException("Settlement legs require a valid settlement ID and cannot be transfers, investments, adjustments, or categorized.");
        WorkspaceSettlementId = workspaceSettlementId;
        InvestmentId = investmentId;
        InvestmentCashKind = investmentCashKind;
        IsReconciliationAdjustment = isReconciliationAdjustment;
        AddAllocations(allocations);
    }

    private void AddAllocations(IReadOnlyList<TransactionCategoryAllocationInput>? allocations)
    {
        if (allocations is null || allocations.Count == 0) return;
        if (TransferId.HasValue) throw new ArgumentException("Transfers cannot carry allocations.", nameof(allocations));
        if (allocations.Any(allocation => allocation.CategoryId == Guid.Empty))
            throw new ArgumentException("Allocation category IDs must be valid.", nameof(allocations));
        if (allocations.Select(allocation => allocation.CategoryId).Distinct().Count() != allocations.Count)
            throw new ArgumentException("Allocations cannot contain a duplicate category.", nameof(allocations));
        foreach (var allocation in allocations)
        {
            if (decimal.Round(allocation.Amount, Amount.Currency.DecimalPlaces) != allocation.Amount)
                throw new ArgumentException("Allocation amount exceeds the transaction currency precision.", nameof(allocations));
            _categoryAllocations.Add(TransactionCategoryAllocation.Create(UserId, Id, allocation.CategoryId, allocation.Amount, CreatedAt));
        }
        if (_categoryAllocations.Sum(allocation => allocation.Amount) != Amount.Amount)
            throw new ArgumentException("Allocation sum must equal the parent amount.", nameof(allocations));
    }

    public static Transaction Create(
        Guid userId,
        Guid accountId,
        Money amount,
        TransactionDirection direction,
        Guid? categoryId,
        DateTime occurredAt,
        string? description,
        decimal? appliedRate = null,
        string? rateSource = null,
        DateTime? createdAt = null,
        IReadOnlyList<TransactionCategoryAllocationInput>? allocations = null)
    {
        return new Transaction(
            Guid.NewGuid(),
            userId,
            accountId,
            amount,
            direction,
            categoryId,
            occurredAt,
            description,
            reversesId: null,
            transferId: null,
            appliedRate: appliedRate,
            rateSource: rateSource,
            createdAt: createdAt ?? DateTime.UtcNow,
            allocations: allocations);
    }

    public static Transaction CreateLoanPosting(Guid userId, Guid loanId, Guid? accountId, Money amount,
        TransactionDirection direction, LoanCashKind kind, Guid? categoryId, DateTime occurredAt,
        string? description, decimal? appliedRate, string? rateSource, DateTime createdAt)
    {
        if (loanId == Guid.Empty || !Enum.IsDefined(kind) || !Enum.IsDefined(direction))
            throw new ArgumentException("A loan posting requires a valid loan and posting kind.");
        if ((kind == Ledger.Domain.Transactions.LoanCashKind.CardPurchase) != !accountId.HasValue)
            throw new ArgumentException("Only card purchases may have a noncash loan source.");
        if (kind == Ledger.Domain.Transactions.LoanCashKind.Principal && categoryId.HasValue)
            throw new ArgumentException("Principal cannot be categorized as income or expense.");
        if (kind == Ledger.Domain.Transactions.LoanCashKind.CardPurchase && direction != TransactionDirection.Expense)
            throw new ArgumentException("A card purchase must recognize an expense.");
        // A card source is explicitly the LoanId, not a cash account. No account
        // row or offsetting cash leg is created. LoanCashKind determines effects.
        var posting = new Transaction(Guid.NewGuid(), userId, accountId ?? loanId, amount, direction,
            categoryId, occurredAt, description, null, null, appliedRate, rateSource, createdAt);
        posting.LoanId = loanId;
        posting.LoanCashKind = kind;
        return posting;
    }

    public static Transaction CreateReconciliationAdjustment(
        Guid userId, Guid accountId, Money amount, TransactionDirection direction, DateTime occurredAt,
        string? description, DateTime? createdAt = null) =>
        new(Guid.NewGuid(), userId, accountId, amount, direction, null, occurredAt, description,
            null, null, null, null, createdAt ?? DateTime.UtcNow, isReconciliationAdjustment: true);

    public static Transaction CreateInvestmentCash(
        Guid userId, Guid accountId, Money amount, InvestmentCashKind kind, Guid investmentId,
        DateTime occurredAt, string? description, decimal? appliedRate, string? rateSource, DateTime? createdAt = null) =>
        new(Guid.NewGuid(), userId, accountId, amount,
            kind == Ledger.Domain.Transactions.InvestmentCashKind.Contribution ? TransactionDirection.Expense : TransactionDirection.Income,
            null, occurredAt, description, null, null, appliedRate, rateSource, createdAt ?? DateTime.UtcNow,
            investmentId: investmentId, investmentCashKind: kind);

    public static Transaction CreateWorkspaceSettlementLeg(
        Guid userId, Guid accountId, Money amount, TransactionDirection direction, Guid workspaceSettlementId,
        DateTime occurredAt, string? description, decimal? appliedRate, string? rateSource, DateTime? createdAt = null)
    {
        if (workspaceSettlementId == Guid.Empty || !Enum.IsDefined(direction))
            throw new ArgumentException("A settlement leg requires a valid settlement ID and direction.");
        return new(Guid.NewGuid(), userId, accountId, amount, direction, null, occurredAt, description,
            null, null, appliedRate, rateSource, createdAt ?? DateTime.UtcNow, workspaceSettlementId: workspaceSettlementId);
    }

    public static Transaction CreateReversal(
        Transaction original,
        DateTime occurredAt,
        string? reason = null,
        DateTime? createdAt = null)
    {
        ArgumentNullException.ThrowIfNull(original);

        var oppositeDirection = original.Direction == TransactionDirection.Income
            ? TransactionDirection.Expense
            : TransactionDirection.Income;

        var description = string.IsNullOrWhiteSpace(reason)
            ? $"Reversal of transaction {original.Id}"
            : $"Reversal of transaction {original.Id}: {reason.Trim()}";

        var reversal = new Transaction(
            Guid.NewGuid(),
            original.UserId,
            original.AccountId,
            original.Amount,
            oppositeDirection,
            original.CategoryId,
            occurredAt,
            description,
            reversesId: original.Id,
            transferId: null,
            appliedRate: original.AppliedRate,
            rateSource: original.RateSource,
            createdAt: createdAt ?? DateTime.UtcNow,
            allocations: original.CategoryAllocations.Select(allocation => new TransactionCategoryAllocationInput(allocation.CategoryId, allocation.Amount)).ToArray(),
            investmentId: original.InvestmentId,
            investmentCashKind: original.InvestmentCashKind,
            isReconciliationAdjustment: original.IsReconciliationAdjustment,
            workspaceSettlementId: original.WorkspaceSettlementId);
        reversal.LoanId = original.LoanId;
        reversal.LoanCashKind = original.LoanCashKind;
        return reversal;
    }

    public static (Transaction Outflow, Transaction Inflow) CreateTransferReversal(
        Transaction originalOutflow,
        Transaction originalInflow,
        DateTime occurredAt,
        string? reason = null,
        DateTime? createdAt = null)
    {
        ArgumentNullException.ThrowIfNull(originalOutflow);
        ArgumentNullException.ThrowIfNull(originalInflow);
        if (originalOutflow.TransferId is null || originalOutflow.TransferId != originalInflow.TransferId ||
            originalOutflow.Direction != TransactionDirection.Expense || originalInflow.Direction != TransactionDirection.Income ||
            originalOutflow.UserId != originalInflow.UserId)
        {
            throw new ArgumentException("A transfer reversal requires both original legs of the same transfer.");
        }

        var transferId = Guid.NewGuid();
        var now = createdAt ?? DateTime.UtcNow;
        var suffix = string.IsNullOrWhiteSpace(reason) ? "" : $": {reason.Trim()}";
        var outflow = new Transaction(Guid.NewGuid(), originalOutflow.UserId, originalOutflow.AccountId,
            originalOutflow.Amount, TransactionDirection.Income, null, occurredAt,
            $"Reversal of transfer {originalOutflow.TransferId}{suffix}", originalOutflow.Id, transferId,
            originalOutflow.AppliedRate, originalOutflow.RateSource, now);
        var inflow = new Transaction(Guid.NewGuid(), originalInflow.UserId, originalInflow.AccountId,
            originalInflow.Amount, TransactionDirection.Expense, null, occurredAt,
            $"Reversal of transfer {originalOutflow.TransferId}{suffix}", originalInflow.Id, transferId,
            originalInflow.AppliedRate, originalInflow.RateSource, now);
        return (outflow, inflow);
    }

    public static (Transaction Outflow, Transaction Inflow) CreateTransfer(
        Guid userId,
        Guid sourceAccountId,
        Money sourceAmount,
        Guid destinationAccountId,
        Money destinationAmount,
        DateTime occurredAt,
        decimal? appliedRate,
        string? rateSource,
        string? description,
        DateTime? createdAt = null,
        IReadOnlyList<TransactionCategoryAllocationInput>? sourceAllocations = null,
        IReadOnlyList<TransactionCategoryAllocationInput>? destinationAllocations = null)
    {
        if (sourceAllocations is { Count: > 0 } || destinationAllocations is { Count: > 0 })
            throw new ArgumentException("Transfers cannot carry allocations.");
        if (sourceAccountId == destinationAccountId)
        {
            throw new InvalidOperationException("Source and destination accounts must be distinct for a transfer.");
        }

        var transferId = Guid.NewGuid();
        var now = createdAt ?? DateTime.UtcNow;

        var outflow = new Transaction(
            Guid.NewGuid(),
            userId,
            sourceAccountId,
            sourceAmount,
            TransactionDirection.Expense,
            categoryId: null,
            occurredAt: occurredAt,
            description: description ?? "Transfer Out",
            reversesId: null,
            transferId: transferId,
            appliedRate: appliedRate,
            rateSource: rateSource,
            createdAt: now);

        var inflow = new Transaction(
            Guid.NewGuid(),
            userId,
            destinationAccountId,
            destinationAmount,
            TransactionDirection.Income,
            categoryId: null,
            occurredAt: occurredAt,
            description: description ?? "Transfer In",
            reversesId: null,
            transferId: transferId,
            appliedRate: appliedRate,
            rateSource: rateSource,
            createdAt: now);

        return (outflow, inflow);
    }
}
