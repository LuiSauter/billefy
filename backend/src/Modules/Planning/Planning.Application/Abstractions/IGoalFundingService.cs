using BuildingBlocks.Common;
using Planning.Contracts;
using Planning.Domain.Goals;

namespace Planning.Application.Abstractions;

public interface IGoalFundingService
{
    Task<Result<GoalFundingResult>> RecordAsync(Guid goalId, string kind, GoalFundingRequest request, Guid? key, CancellationToken ct = default);
    Task<Result<List<GoalFundingEntryDto>>> GetHistoryAsync(Guid goalId, CancellationToken ct = default);
    Task<List<GoalFundingEntry>> GetForUserAsync(Guid userId, CancellationToken ct = default);
}
