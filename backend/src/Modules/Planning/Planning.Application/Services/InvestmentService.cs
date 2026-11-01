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
            clock.UtcNow);

        await repository.AddAsync(investment, cancellationToken);
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
        i.ArchivedAt);
}
