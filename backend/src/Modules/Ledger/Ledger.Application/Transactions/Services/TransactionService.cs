using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Ledger.Application.Abstractions;
using Ledger.Application.Transactions.RegisterTransaction;
using Ledger.Application.Transactions.RegisterTransfer;
using Ledger.Application.Transactions.ReverseTransaction;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Transactions.Services;

public sealed class TransactionService(
    ITransactionRepository transactionRepository,
    RegisterTransactionCommandHandler registerHandler,
    RegisterTransferCommandHandler transferHandler,
    ReverseTransactionCommandHandler reverseHandler,
    ICurrentUserContext userContext,
    IClock clock,
    IAccountRepository? accountRepository = null,
    IUnitOfWork? unitOfWork = null,
    ICategoryRepository? categoryRepository = null) : ITransactionService
{
    public async Task<Result<MovementPage>> GetMovementsAsync(MovementQuery query, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated || userContext.UserId is null)
            return Result.Failure<MovementPage>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        if (query.Page is < 1 or > 100000 || query.PageSize is < 1 or > 100 ||
            (query.StartUtc.HasValue && query.StartUtc.Value.Kind != DateTimeKind.Utc) ||
            (query.EndUtcExclusive.HasValue && query.EndUtcExclusive.Value.Kind != DateTimeKind.Utc) ||
            (query.StartUtc.HasValue && query.EndUtcExclusive.HasValue && query.StartUtc.Value >= query.EndUtcExclusive.Value) ||
            !Enum.IsDefined(query.Mode) || (query.Type.HasValue && !Enum.IsDefined(query.Type.Value)))
            return Result.Failure<MovementPage>(Error.Validation("Movement.InvalidQuery", "Movement query bounds, mode, type, page, or page size are invalid."));

        var result = await transactionRepository.GetMovementPageAsync(userContext.UserId.Value,
            new MovementRepositoryQuery(query.StartUtc, query.EndUtcExclusive, query.AccountId, query.CategoryId,
                query.Type?.ToString(), query.Search, query.Mode == MovementHistoryMode.Audit, query.Page, query.PageSize),
            cancellationToken);
        var items = result.Items.Select(entry =>
        {
            var row = entry.Representative;
            var kind = entry.IsTransfer ? "Transfer" : row.IsReconciliationAdjustment ? "Adjustment" : row.InvestmentId.HasValue ? "Investment" : row.Direction.ToString();
            return new MovementDto(entry.IsTransfer ? row.TransferId!.Value : row.Id, kind, row.Amount, row.Currency,
                row.Direction.ToString(), row.OccurredAt, row.AccountId, row.AccountName, row.CategoryId, row.CategoryName,
                row.Description, row.AppliedRate, row.RateSource, row.ReversesId.HasValue, row.ReversesId,
                entry.Legs.Select(leg => new MovementLegDto(leg.Id, leg.AccountId, leg.AccountName, leg.Amount, leg.Currency,
                    leg.Direction.ToString(), leg.AppliedRate, leg.RateSource)).ToList(),
                entry.Allocations.Select(item => new TransactionAllocationDto(item.CategoryId, item.CategoryName, item.Amount)).ToList(),
                row.InvestmentId, row.InvestmentCashKind, row.IsReconciliationAdjustment);
        }).ToList();
        var summary = result.Summary.Select(row => new MovementCurrencySummary(row.Currency, row.Income, row.Expenses,
            row.TransferOut, row.TransferIn, row.Contributions, row.Disposals)).ToList();
        return Result.Success(new MovementPage(items, query.Page, query.PageSize, result.TotalCount, summary));
    }

    public async Task<Result<List<TransactionDto>>> GetTransactionsAsync(
        Guid? accountId = null,
        TransactionDirection? direction = null,
        DateTime? from = null,
        DateTime? to = null,
        int limit = 50,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<List<TransactionDto>>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var txns = await transactionRepository.GetFilteredAsync(
            userContext.UserId!.Value,
            accountId,
            direction,
            from,
            to,
            limit,
            cancellationToken);

        var allocationRows = txns.SelectMany(transaction => transaction.CategoryAllocations.Select(allocation => allocation.CategoryId)).Distinct().ToArray();
        var labels = categoryRepository is null || allocationRows.Length == 0
            ? new Dictionary<Guid, string>()
            : (await Task.WhenAll(allocationRows.Select(async categoryId =>
            {
                var category = await categoryRepository.GetByIdAsync(categoryId, cancellationToken);
                return (categoryId, category?.UserId == userContext.UserId ? category.Name : null);
            }))).Where(row => row.Item2 is not null).ToDictionary(row => row.categoryId, row => row.Item2!);
        var dtos = txns.Select(t => new TransactionDto(t.Id, t.AccountId, t.Amount.Amount, t.Amount.Currency.Code,
            t.Direction.ToString(), t.CategoryId, t.OccurredAt, t.Description, t.ReversesId, t.TransferId,
            t.AppliedRate, t.RateSource, t.CreatedAt,
            t.CategoryAllocations.Select(allocation => new TransactionAllocationDto(allocation.CategoryId,
                labels.GetValueOrDefault(allocation.CategoryId), allocation.Amount)).ToList(), t.IsReconciliationAdjustment)).ToList();

        return Result.Success(dtos);
    }

    public Task<Result<Guid>> RegisterTransactionAsync(
        RegisterTransactionRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new RegisterTransactionCommand(request.AccountId, request.Amount, request.Direction, request.CategoryId,
            request.OccurredAt ?? clock.UtcNow, request.Description, request.AppliedRate, request.RateSource,
            request.Allocations?.Select(item => new TransactionCategoryAllocationInput(item.CategoryId, item.Amount)).ToArray());
        return RegisterValidatedAsync(request.CategoryId, request.Allocations, request.AccountId, request.Amount, request.Direction, command, cancellationToken);
    }

    private async Task<Result<Guid>> RegisterValidatedAsync(Guid? categoryId, IReadOnlyList<TransactionAllocationRequest>? allocations,
        Guid accountId, decimal amount, TransactionDirection direction, RegisterTransactionCommand command, CancellationToken cancellationToken)
    {
        var validation = await ValidateCategoriesAsync(categoryId, allocations, accountId, amount, direction, cancellationToken);
        if (validation.IsFailure) return Result.Failure<Guid>(validation.Error);
        return await registerHandler.HandleAsync(command, cancellationToken);
    }

    private async Task<Result> ValidateCategoriesAsync(Guid? categoryId, IReadOnlyList<TransactionAllocationRequest>? allocations,
        Guid accountId, decimal amount, TransactionDirection direction, CancellationToken cancellationToken)
    {
        if (allocations is not null && (categoryId.HasValue || allocations.Count == 0))
            return Result.Failure(Error.Validation("Transaction.InvalidAllocations", "Allocations must be non-empty and cannot be combined with categoryId."));
        var account = await accountRepository!.GetByIdAsync(accountId, cancellationToken);
        if (account is null) return Result.Failure(Error.NotFound("Account.NotFound", "Account not found."));
        if (allocations is not null && (allocations.Any(item => item.Amount <= 0 || decimal.Round(item.Amount, account.Currency.DecimalPlaces) != item.Amount) ||
            allocations.Select(item => item.CategoryId).Distinct().Count() != allocations.Count || allocations.Sum(item => item.Amount) != amount))
            return Result.Failure(Error.Validation("Transaction.InvalidAllocations", "Allocation amounts must be positive, unique, currency-precise, and sum exactly to the transaction amount."));
        var ids = (categoryId.HasValue ? new[] { categoryId.Value } : []).Concat(allocations?.Select(item => item.CategoryId) ?? []).Distinct();
        foreach (var id in ids)
        {
            var category = await categoryRepository!.GetByIdAsync(id, cancellationToken);
            if (category is null || category.UserId != userContext.UserId)
                return Result.Failure(Error.NotFound("Category.NotFound", "Category not found."));
            if (HasTypedDirection(category.Icon) && !category.Icon!.StartsWith(direction + "|", StringComparison.Ordinal))
                return Result.Failure(Error.Validation("Category.DirectionMismatch", "Category direction does not match the transaction."));
        }
        return Result.Success();
    }

    private static bool HasTypedDirection(string? icon) => icon?.StartsWith("Income|", StringComparison.Ordinal) == true ||
        icon?.StartsWith("Expense|", StringComparison.Ordinal) == true;

    public async Task<Result<TransferResult>> RegisterTransferAsync(
        RegisterTransferRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new RegisterTransferCommand(
            request.SourceAccountId,
            request.SourceAmount,
            request.DestinationAccountId,
            request.DestinationAmount,
            request.OccurredAt ?? clock.UtcNow,
            request.AppliedRate,
            request.RateSource,
            request.Description);

        var result = await transferHandler.HandleAsync(command, cancellationToken);
        if (result.IsFailure)
        {
            return Result.Failure<TransferResult>(result.Error);
        }

        return Result.Success(new TransferResult(result.Value.OutflowId, result.Value.InflowId));
    }

    public async Task<Result<TransferResult>> CorrectTransferAsync(Guid transferId, CorrectTransferRequest request, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated || userContext.UserId is null)
            return Result.Failure<TransferResult>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        if (request.SourceAmount <= 0 || request.DestinationAmount <= 0 || request.SourceAccountId == request.DestinationAccountId)
            return Result.Failure<TransferResult>(Error.Validation("Transfer.InvalidReplacement", "Replacement accounts must differ and amounts must be positive."));

        await using var transaction = await unitOfWork!.BeginSerializableTransactionAsync(cancellationToken);
        var originals = await transactionRepository.GetTransferLegsAsync(userContext.UserId.Value, transferId, cancellationToken);
        if (originals.Count != 2 || originals.Any(leg => leg.ReversesId.HasValue) ||
            originals.Count(leg => leg.Direction == TransactionDirection.Expense) != 1 ||
            originals.Count(leg => leg.Direction == TransactionDirection.Income) != 1)
            return Result.Failure<TransferResult>(Error.NotFound("Transfer.NotFound", "Transfer not found."));
        if (await transactionRepository.GetReversalByOriginalIdAsync(originals[0].Id, cancellationToken) is not null ||
            await transactionRepository.GetReversalByOriginalIdAsync(originals[1].Id, cancellationToken) is not null)
            return Result.Failure<TransferResult>(Error.Conflict("Transaction.AlreadyReversed", "Transfer has already been reversed."));

        var source = await accountRepository!.GetByIdAsync(request.SourceAccountId, cancellationToken);
        var destination = await accountRepository.GetByIdAsync(request.DestinationAccountId, cancellationToken);
        if (source is null || destination is null)
            return Result.Failure<TransferResult>(Error.NotFound("Account.NotFound", "A replacement account was not found."));

        var quote = await transferHandler.ValidateAmountsAsync(source, request.SourceAmount, destination,
            request.DestinationAmount, request.AppliedRate, request.RateSource, userContext.UserId.Value, cancellationToken);
        if (quote.IsFailure) return Result.Failure<TransferResult>(quote.Error);

        var outflow = originals.Single(leg => leg.Direction == TransactionDirection.Expense);
        var sourceBalance = await transactionRepository.CalculateBalanceAsync(source.Id, cancellationToken);
        var projectedBalance = source.Id == outflow.AccountId
            ? sourceBalance + outflow.Amount.Amount
            : sourceBalance;
        if (request.SourceAmount > projectedBalance)
            return Result.Failure<TransferResult>(Error.Validation("Transfer.InsufficientFunds", "The source account does not have enough funds for this transfer."));
        var inflow = originals.Single(leg => leg.Direction == TransactionDirection.Income);
        var now = clock.UtcNow;
        var (reversalOutflow, reversalInflow) = Transaction.CreateTransferReversal(outflow, inflow, now, "Superseded by corrected transfer", now);
        var (replacementOutflow, replacementInflow) = Transaction.CreateTransfer(userContext.UserId.Value,
            source.Id, Money.Of(request.SourceAmount, source.Currency), destination.Id,
            Money.Of(request.DestinationAmount, destination.Currency), request.OccurredAt ?? now,
            quote.Value.AppliedRate, quote.Value.RateSource, request.Description, now);
        await transactionRepository.AddRangeAsync([reversalOutflow, reversalInflow, replacementOutflow, replacementInflow], cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Result.Success(new TransferResult(replacementOutflow.Id, replacementInflow.Id));
    }

    public async Task<Result<ReverseResult>> ReverseTransactionAsync(
        Guid id,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        var command = new ReverseTransactionCommand(id, reason);
        var result = await reverseHandler.HandleAsync(command, cancellationToken);
        if (result.IsFailure)
        {
            return Result.Failure<ReverseResult>(result.Error);
        }

        return Result.Success(new ReverseResult(result.Value, id));
    }

    public async Task<Result<Guid>> UpdateTransactionAsync(
        Guid id,
        UpdateTransactionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<Guid>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var original = await transactionRepository.GetByIdAsync(id, cancellationToken);
        if (original is null || original.UserId != userContext.UserId)
            return Result.Failure<Guid>(Error.NotFound("Transaction.NotFound", "Transaction not found."));
        if (original.WorkspaceSettlementId.HasValue)
            return Result.Failure<Guid>(Error.Conflict("WorkspaceSettlement.Immutable", "Settlement legs cannot be edited as ordinary transactions."));
        if (original.InvestmentId.HasValue)
            return Result.Failure<Guid>(Error.Conflict("InvestmentCash.Immutable", "Investment cash movements cannot be edited as ordinary transactions."));
        if (original.IsReconciliationAdjustment)
            return Result.Failure<Guid>(Error.Conflict("ReconciliationAdjustment.Immutable", "Reconciliation adjustments cannot be edited as ordinary transactions."));
        if (original.TransferId.HasValue || original.ReversesId.HasValue)
            return Result.Failure<Guid>(Error.Conflict("Transaction.TransferRequiresAtomicEdit", "Transfers and reversals cannot be edited as ordinary transactions."));

        var validation = await ValidateCategoriesAsync(request.CategoryId, request.Allocations, request.AccountId, request.Amount,
            request.Direction, cancellationToken);
        if (validation.IsFailure) return Result.Failure<Guid>(validation.Error);
        var targetAccount = await accountRepository!.GetByIdAsync(request.AccountId, cancellationToken);
        if (targetAccount is null) return Result.Failure<Guid>(Error.NotFound("Account.NotFound", "Account not found."));
        var preserveSnapshot = original.AccountId == targetAccount.Id && original.Amount.Currency == targetAccount.Currency;
        var replacement = await registerHandler.PrepareAsync(new RegisterTransactionCommand(request.AccountId, request.Amount,
            request.Direction, request.CategoryId, request.OccurredAt ?? clock.UtcNow, request.Description,
            preserveSnapshot ? original.AppliedRate : null, preserveSnapshot ? original.RateSource : null,
            request.Allocations?.Select(item => new TransactionCategoryAllocationInput(item.CategoryId, item.Amount)).ToArray()), cancellationToken);
        if (replacement.IsFailure) return Result.Failure<Guid>(replacement.Error);

        if (await transactionRepository.GetReversalByOriginalIdAsync(original.Id, cancellationToken) is not null)
            return Result.Failure<Guid>(Error.Conflict("Transaction.AlreadyReversed", "Transaction already has a reversal."));
        var now = clock.UtcNow;
        var reversal = Transaction.CreateReversal(original, now, "Superseded by edited transaction", now);
        await transactionRepository.AddRangeAsync([reversal, replacement.Value], cancellationToken);
        try { await unitOfWork!.SaveChangesAsync(cancellationToken); }
        catch
        {
            if (await transactionRepository.GetReversalByOriginalIdAsync(original.Id, cancellationToken) is not null)
                return Result.Failure<Guid>(Error.Conflict("Transaction.AlreadyReversed", "Transaction already has a reversal."));
            throw;
        }
        return Result.Success(replacement.Value.Id);
    }
}
