using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Goals;
using static Workspaces.Application.Services.WorkspaceAccess;

namespace Workspaces.Application.Services;

public interface ISharedGoalService
{
    Task<Result<IReadOnlyList<SharedGoalDto>>> ListAsync(Guid id, CancellationToken ct = default);
    Task<Result<SharedGoalDto>> CreateAsync(Guid id, CreateSharedGoalRequest request, CancellationToken ct = default);
    Task<Result<SharedGoalDto>> ContributeAsync(Guid id, Guid goalId, ContributeGoalRequest request, CancellationToken ct = default);
}

public sealed class SharedGoalService(IWorkspaceRepository repository, WorkspaceAccess access) : ISharedGoalService
{
    public Task<Result<IReadOnlyList<SharedGoalDto>>> ListAsync(Guid id, CancellationToken ct = default) =>
        ReadAsync<IReadOnlyList<SharedGoalDto>>(async () =>
        {
            var (workspace, _) = await access.RequireAsync(id, ct);
            return (await repository.ListAsync<SharedGoal>(x => x.WorkspaceId == id, ct)).OrderBy(x => x.Title)
                .Select(x => Map(x, workspace.Settings.ShowIndividualContributions)).ToArray();
        });

    public Task<Result<SharedGoalDto>> CreateAsync(Guid id, CreateSharedGoalRequest request, CancellationToken ct = default) =>
        access.WriteAsync(async () =>
        {
            var (workspace, _) = await access.RequireAsync(id, ct, manage: true);
            var currency = CurrencyFor(workspace, request.Currency);
            Validate(!string.IsNullOrWhiteSpace(request.Title) && request.Title.Trim().Length <= 150, "A title of at most 150 characters is required.");
            var goal = new SharedGoal(Guid.NewGuid(), id, request.Title, new Money(request.TargetAmount, currency),
                new Money(request.MonthlyCommitmentAmount, currency), request.TargetDate, request.Category);
            repository.Add(goal);
            return Map(goal, workspace.Settings.ShowIndividualContributions);
        }, ct);

    public Task<Result<SharedGoalDto>> ContributeAsync(Guid id, Guid goalId, ContributeGoalRequest request, CancellationToken ct = default) =>
        access.WriteAsync(async () =>
        {
            var (workspace, member) = await access.RequireAsync(id, ct);
            var currency = CurrencyFor(workspace, request.Currency);
            Validate(request.Amount == decimal.Round(request.Amount, currency.DecimalPlaces), "Amount exceeds currency precision.");
            var goal = (await repository.ListAsync<SharedGoal>(x => x.Id == goalId && x.WorkspaceId == id, ct)).SingleOrDefault() ?? throw Missing();
            Validate(goal.Status == SharedGoalStatus.Active, "Only active goals accept contributions.");
            if (request.IdempotencyKey.HasValue)
            {
                var previous = goal.MemberContributions.SingleOrDefault(c => c.IdempotencyKey == request.IdempotencyKey);
                if (previous is not null)
                {
                    Validate(previous.MemberId == member.Id && previous.Amount == new Money(request.Amount, currency),
                        "The idempotency key was already used with a different contribution.");
                    return Map(goal, workspace.Settings.ShowIndividualContributions);
                }
            }
            goal.AddContribution(new SharedGoalContribution(Guid.NewGuid(), member.Id, new Money(request.Amount, currency), access.Now, request.IdempotencyKey));
            return Map(goal, workspace.Settings.ShowIndividualContributions);
        }, ct);

    internal static SharedGoalDto Map(SharedGoal g, bool showContributions) => new(g.Id, g.Title, g.Category,
        g.TargetAmount.Amount, g.CurrentAmount.Amount, g.Currency.Code, g.TargetDate, g.MonthlyCommitmentAmount.Amount, g.Status,
        showContributions ? g.MemberContributions.Select(c => new SharedGoalContributionDto(c.MemberId, c.Amount.Amount, c.ContributedAt)).ToArray() : []);
}
