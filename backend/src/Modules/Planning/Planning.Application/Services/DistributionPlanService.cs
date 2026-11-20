using System.Text.Json;
using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Ledger.Contracts;
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
    ILedgerModule ledgerModule,
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

        if (request.Enabled && buckets.Count < 2)
            return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.TooFewBuckets", "An enabled plan needs at least two groups."));

        if (buckets.Any(b => string.IsNullOrWhiteSpace(b.Name) || b.Name.Trim().Length > 60))
            return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.InvalidBucketName", "Each group needs a name of up to 60 characters."));

        if (buckets.Any(b => b.Percent < 0m || b.Percent > 100m || (request.Enabled && b.Percent == 0m)))
            return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.InvalidPercent", "Percentages must be between 0 and 100, and positive for enabled plans."));

        var total = buckets.Sum(b => b.Percent);
        if (total > 100m || (request.Enabled && total != 100m))
            return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.InvalidTotal", "Enabled plans must total exactly 100%; drafts cannot exceed 100%."));

        if (buckets.Any(b => b.TrackingMode is not ("Expenses" or "TargetOnly")))
            return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.InvalidTrackingMode", "Tracking mode must be Expenses or TargetOnly; omit it to default to Expenses."));

        if (buckets.Any(b => b.TrackingMode == "TargetOnly" && b.CategoryIds is { Count: > 0 }))
            return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.TargetOnlyCategories", "Target-only groups cannot have assigned expense categories."));

        var normalized = buckets
            .Select(b => b with { Name = b.Name.Trim(), CategoryIds = b.CategoryIds ?? [] })
            .ToList();
        var json = JsonSerializer.Serialize(normalized);

        var userId = userContext.UserId!.Value;
        var plan = await repository.GetByUserIdAsync(userId, cancellationToken);

        // Allow disabling/resaving unchanged legacy data, including stale category references.
        // Any edit or activation must satisfy current category validation.
        var unchangedDisabled = !request.Enabled && plan is not null
            && JsonSerializer.Serialize(ToDto(plan).Buckets) == json;
        if (unchangedDisabled)
        {
            json = plan!.BucketsJson;
        }
        else
        {
            var categoryIds = new HashSet<Guid>();
            foreach (var categoryId in normalized.SelectMany(b => b.CategoryIds))
            {
                if (!Guid.TryParse(categoryId, out var id))
                    return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.InvalidCategory", "Each category must be an existing expense category owned by the user."));

                if (!categoryIds.Add(id))
                    return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.DuplicateCategory", "A category can belong to only one group."));
            }

            if (categoryIds.Count > 0)
            {
                var expenseCategoryIds = await ledgerModule.GetExpenseCategoryIdsForCurrentUserAsync(cancellationToken);
                if (!categoryIds.IsSubsetOf(expenseCategoryIds))
                    return Result.Failure<DistributionPlanDto>(Error.Validation("Plan.InvalidCategory", "Each category must be an existing expense category owned by the user."));
            }
        }

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
