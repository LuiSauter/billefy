using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Planning.Application.Abstractions;
using Planning.Contracts;
using Planning.Domain.Investments;

namespace Planning.Application.Services;

public interface IInvestmentService
{
    Task<Result<Guid>> CreateAsync(CreateInvestmentRequest request, CancellationToken cancellationToken = default);
    Task<Result<List<InvestmentDto>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Result<InvestmentDto>> UpdateValueAsync(Guid id, UpdateInvestmentValueRequest request, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<InvestmentTransactionDto>> RegisterOperationAsync(Guid investmentId, RegisterInvestmentOperationRequest request, CancellationToken cancellationToken = default);
    Task<Result<List<InvestmentTransactionDto>>> GetTransactionsAsync(Guid investmentId, CancellationToken cancellationToken = default);
}

public sealed class InvestmentService(
    IInvestmentRepository repository,
    IPlanningUnitOfWork unitOfWork,
    ICurrentUserContext userContext,
    IClock clock) : IInvestmentService
{
    public async Task<Result<Guid>> CreateAsync(CreateInvestmentRequest request, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
            return Result.Failure<Guid>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        if (string.IsNullOrWhiteSpace(request.Name))
            return Result.Failure<Guid>(Error.Validation("Investment.InvalidName", "Investment name is required."));
        if (request.Quantity <= decimal.Zero)
            return Result.Failure<Guid>(Error.Validation("Investment.InvalidQuantity", "Quantity must be strictly positive."));
        if (request.CurrentValue <= decimal.Zero)
            return Result.Failure<Guid>(Error.Validation("Investment.InvalidValue", "Current value must be strictly positive."));
        if (string.IsNullOrWhiteSpace(request.Currency))
            return Result.Failure<Guid>(Error.Validation("Investment.InvalidCurrency", "Currency is required."));

        var investment = Investment.Create(
            userContext.UserId!.Value,
            request.Name,
            request.Kind,
            request.IconKey,
            request.ColorKey,
            request.Currency,
            request.Quantity,
            request.CurrentValue,
            clock.UtcNow,
            request.Ticker);

        await repository.AddAsync(investment, cancellationToken);

        // Record initial position purchase in transaction ledger
        var unitPrice = request.Quantity > decimal.Zero ? request.CurrentValue / request.Quantity : request.CurrentValue;
        var initialTx = InvestmentTransaction.Create(
            userContext.UserId!.Value,
            investment.Id,
            InvestmentTransactionType.Buy,
            request.Quantity,
            unitPrice,
            request.CurrentValue,
            decimal.Zero,
            clock.UtcNow,
            "Registro inicial de posición",
            null,
            clock.UtcNow);

        await repository.AddTransactionAsync(initialTx, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success(investment.Id);
    }

    public async Task<Result<List<InvestmentDto>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
            return Result.Failure<List<InvestmentDto>>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var items = await repository.GetByUserIdAsync(userContext.UserId!.Value, cancellationToken);
        return Result.Success(items.Select(ToDto).ToList());
    }

    public async Task<Result<InvestmentDto>> UpdateValueAsync(Guid id, UpdateInvestmentValueRequest request, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
            return Result.Failure<InvestmentDto>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        if (request.CurrentValue <= decimal.Zero)
            return Result.Failure<InvestmentDto>(Error.Validation("Investment.InvalidValue", "Current value must be strictly positive."));
        if (request.Quantity.HasValue && request.Quantity.Value <= decimal.Zero)
            return Result.Failure<InvestmentDto>(Error.Validation("Investment.InvalidQuantity", "Quantity must be strictly positive."));

        var investment = await repository.GetByIdAsync(id, cancellationToken);
        if (investment is null || investment.UserId != userContext.UserId!.Value)
            return Result.Failure<InvestmentDto>(Error.NotFound("Investment.NotFound", $"Investment {id} was not found."));

        if (investment.ArchivedAt.HasValue)
            return Result.Failure<InvestmentDto>(Error.Conflict("Investment.Archived", "Archived investments cannot be revalued."));
        investment.UpdateValue(request.CurrentValue, request.Quantity, clock.UtcNow);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success(ToDto(investment));
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
            return Result.Failure(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var investment = await repository.GetByIdAsync(id, cancellationToken);
        if (investment is null || investment.UserId != userContext.UserId!.Value)
            return Result.Failure(Error.NotFound("Investment.NotFound", $"Investment {id} was not found."));

        investment.Archive(clock.UtcNow);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<InvestmentTransactionDto>> RegisterOperationAsync(
        Guid investmentId,
        RegisterInvestmentOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
            return Result.Failure<InvestmentTransactionDto>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var investment = await repository.GetByIdAsync(investmentId, cancellationToken);
        if (investment is null || investment.UserId != userContext.UserId!.Value)
            return Result.Failure<InvestmentTransactionDto>(Error.NotFound("Investment.NotFound", $"Investment {investmentId} was not found."));

        if (investment.ArchivedAt.HasValue)
            return Result.Failure<InvestmentTransactionDto>(Error.Conflict("Investment.Archived", "Archived investments cannot register operations."));

        if (!Enum.TryParse<InvestmentTransactionType>(request.Type, true, out var txType))
            return Result.Failure<InvestmentTransactionDto>(Error.Validation("Investment.InvalidOperationType", $"Operation type '{request.Type}' is invalid."));

        if (request.TotalAmount < decimal.Zero)
            return Result.Failure<InvestmentTransactionDto>(Error.Validation("Investment.InvalidAmount", "Total amount cannot be negative."));
        if (request.Fees < decimal.Zero)
            return Result.Failure<InvestmentTransactionDto>(Error.Validation("Investment.InvalidFees", "Fees cannot be negative."));

        var occurredAt = request.OccurredAt ?? clock.UtcNow;

        decimal newQuantity = investment.Quantity;
        decimal newCurrentValue = investment.CurrentValue;

        switch (txType)
        {
            case InvestmentTransactionType.Buy:
                if (request.Quantity <= decimal.Zero)
                    return Result.Failure<InvestmentTransactionDto>(Error.Validation("Investment.InvalidQuantity", "Quantity must be strictly positive for buy operations."));
                newQuantity = investment.Quantity + request.Quantity;
                newCurrentValue = investment.CurrentValue + request.TotalAmount;
                investment.UpdateValue(newCurrentValue, newQuantity, occurredAt);
                break;

            case InvestmentTransactionType.Sell:
                if (request.Quantity <= decimal.Zero)
                    return Result.Failure<InvestmentTransactionDto>(Error.Validation("Investment.InvalidQuantity", "Quantity must be strictly positive for sell operations."));
                newQuantity = Math.Max(decimal.Zero, investment.Quantity - request.Quantity);
                newCurrentValue = Math.Max(decimal.Zero, investment.CurrentValue - (request.Quantity * request.UnitPrice));
                if (newQuantity == decimal.Zero) newCurrentValue = decimal.Zero;
                if (newCurrentValue > decimal.Zero)
                {
                    investment.UpdateValue(newCurrentValue, newQuantity, occurredAt);
                }
                break;

            case InvestmentTransactionType.Revaluation:
                if (request.TotalAmount <= decimal.Zero)
                    return Result.Failure<InvestmentTransactionDto>(Error.Validation("Investment.InvalidAmount", "Total amount must be positive for revaluation."));
                newQuantity = request.Quantity > decimal.Zero ? request.Quantity : investment.Quantity;
                investment.UpdateValue(request.TotalAmount, newQuantity, occurredAt);
                break;

            case InvestmentTransactionType.Dividend:
            case InvestmentTransactionType.Fee:
                break;
        }

        var tx = InvestmentTransaction.Create(
            userContext.UserId!.Value,
            investment.Id,
            txType,
            request.Quantity,
            request.UnitPrice,
            request.TotalAmount,
            request.Fees,
            occurredAt,
            request.Notes,
            null,
            clock.UtcNow);

        await repository.AddTransactionAsync(tx, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(ToTransactionDto(tx));
    }

    public async Task<Result<List<InvestmentTransactionDto>>> GetTransactionsAsync(
        Guid investmentId,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
            return Result.Failure<List<InvestmentTransactionDto>>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var investment = await repository.GetByIdAsync(investmentId, cancellationToken);
        if (investment is null || investment.UserId != userContext.UserId!.Value)
            return Result.Failure<List<InvestmentTransactionDto>>(Error.NotFound("Investment.NotFound", $"Investment {investmentId} was not found."));

        var list = await repository.GetTransactionsByInvestmentIdAsync(investmentId, cancellationToken);
        return Result.Success(list.Select(ToTransactionDto).ToList());
    }

    private static InvestmentDto ToDto(Investment i) => new(
        i.Id,
        i.Name,
        i.Kind,
        i.IconKey,
        i.ColorKey,
        i.Currency,
        i.Quantity,
        i.InitialValue,
        i.CurrentValue,
        i.VariationPct(),
        i.GetHistory().Select(p => new InvestmentValuePointDto(p.At, p.Value)).ToList(),
        i.CreatedAt,
        i.ArchivedAt,
        i.Ticker);

    private static InvestmentTransactionDto ToTransactionDto(InvestmentTransaction t) => new(
        t.Id,
        t.InvestmentId,
        t.Type.ToString(),
        t.Quantity,
        t.UnitPrice,
        t.TotalAmount,
        t.Fees,
        t.OccurredAt,
        t.Notes,
        t.LedgerTransactionId,
        t.CreatedAt);
}
