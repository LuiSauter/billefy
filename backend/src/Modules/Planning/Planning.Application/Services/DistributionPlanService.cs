using System.Text.Json;
using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Planning.Application.Abstractions;
using Planning.Contracts;
using Planning.Domain.Distribution;

namespace Planning.Application.Services;

public interface IDistributionPlanService
{
    Task<Result<DistributionPlanDto>> GetAsync(CancellationToken cancellationToken = default);
    Task<Result<DistributionPlanDto>> SaveAsync(SaveDistributionPlanRequest request, CancellationToken cancellationToken = default);
}

public sealed class DistributionPlanService(
    IDistributionPlanRepository repository,
    IPlanningUnitOfWork unitOfWork,
    ICurrentUserContext userContext,
    IClock clock) : IDistributionPlanService
{
    private const int MaxBuckets = 8;

    public async Task<Result<DistributionPlanDto>> GetAsync(CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
            return Result.Failure<DistributionPlanDto>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var plan = await repository.GetByUserIdAsync(userContext.UserId!.Value, cancellationToken);
        return Result.Success(plan is null ? new DistributionPlanDto(false, []) : ToDto(plan));
    }

    public async Task<Result<DistributionPlanDto>> SaveAsync(SaveDistributionPlanRequest request, CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
            return Result.Failure<DistributionPlanDto>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var buckets = request.Buckets ?? [];
        if (buckets.Count > MaxBuckets)
            return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.TooManyBuckets", $"A plan supports at most {MaxBuckets} groups."));

        if (buckets.Any(b => string.IsNullOrWhiteSpace(b.Name) || b.Name.Trim().Length > 60))
            return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.InvalidBucketName", "Each group needs a name of up to 60 characters."));

        if (buckets.Any(b => b.Percent < 0m || b.Percent > 100m))
            return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.InvalidPercent", "Percentages must be between 0 and 100."));

        // Drafts may add up to less than 100% while the user is editing, but never more.
        if (buckets.Sum(b => b.Percent) > 100m)
            return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.InvalidTotal", "Group percentages cannot add up to more than 100%."));

        var duplicated = buckets
            .SelectMany(b => b.CategoryIds ?? [])
            .GroupBy(c => c)
            .Any(g => g.Count() > 1);
        if (duplicated)
            return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.DuplicateCategory", "A category can belong to only one group."));

        var normalized = buckets
            .Select(b => b with { Name = b.Name.Trim(), CategoryIds = b.CategoryIds ?? [] })
            .ToList();
        var json = JsonSerializer.Serialize(normalized);

        var userId = userContext.UserId!.Value;
        var plan = await repository.GetByUserIdAsync(userId, cancellationToken);
        if (plan is null)
        {
            plan = DistributionPlan.Create(userId, request.Enabled, json, clock.UtcNow);
            await repository.AddAsync(plan, cancellationToken);
        }
        else
        {
            plan.Update(request.Enabled, json);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success(ToDto(plan));
    }

    private static DistributionPlanDto ToDto(DistributionPlan plan)
    {
        List<PlanBucketDto> buckets;
        try
        {
            buckets = JsonSerializer.Deserialize<List<PlanBucketDto>>(plan.BucketsJson) ?? [];
        }
        catch (JsonException)
        {
            buckets = [];
        }

        return new DistributionPlanDto(plan.IsEnabled, buckets);
    }
}
