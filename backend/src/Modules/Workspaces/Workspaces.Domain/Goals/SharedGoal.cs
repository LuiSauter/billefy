using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Workspaces.Contracts;
using Workspaces.Domain.Common;

namespace Workspaces.Domain.Goals;

public sealed record SharedGoalContribution
{
    public Guid Id { get; }
    public Guid MemberId { get; }
    public Money Amount { get; }
    public DateTime ContributedAt { get; }
    public Guid? IdempotencyKey { get; }

    private SharedGoalContribution() { }

    public SharedGoalContribution(Guid id, Guid memberId, Money amount, DateTime contributedAt, Guid? idempotencyKey = null)
    {
        Id = DomainGuard.Id(id, nameof(id));
        MemberId = DomainGuard.Id(memberId, nameof(memberId));
        Amount = DomainGuard.Amount(amount, nameof(amount));
        ContributedAt = contributedAt;
        IdempotencyKey = idempotencyKey.HasValue ? DomainGuard.Id(idempotencyKey.Value, nameof(idempotencyKey)) : null;
    }
}

public sealed class SharedGoal
{
    private readonly List<SharedGoalContribution> _memberContributions = [];

    public Guid Id { get; }
    public Guid WorkspaceId { get; }
    public string Title { get; }
    public string? Category { get; }
    public Money TargetAmount { get; }
    public Currency Currency => TargetAmount.Currency;
    public Money CurrentAmount => new(_memberContributions.Sum(x => x.Amount.Amount), Currency);
    public DateOnly? TargetDate { get; }
    public Money MonthlyCommitmentAmount { get; }
    public SharedGoalStatus Status { get; private set; } = SharedGoalStatus.Active;
    public IReadOnlyList<SharedGoalContribution> MemberContributions => _memberContributions.AsReadOnly();

    private SharedGoal()
    {
        Title = null!;
    }

    public SharedGoal(Guid id, Guid workspaceId, string title, Money targetAmount,
        Money monthlyCommitmentAmount, DateOnly? targetDate = null, string? category = null,
        IEnumerable<SharedGoalContribution>? memberContributions = null)
    {
        Id = DomainGuard.Id(id, nameof(id));
        WorkspaceId = DomainGuard.Id(workspaceId, nameof(workspaceId));
        Title = DomainGuard.Text(title, nameof(title));
        TargetAmount = DomainGuard.Amount(targetAmount, nameof(targetAmount));
        MonthlyCommitmentAmount = DomainGuard.Amount(monthlyCommitmentAmount, nameof(monthlyCommitmentAmount), allowZero: true);
        if (MonthlyCommitmentAmount.Currency != Currency)
            throw new ArgumentException("Commitment must use the goal currency.", nameof(monthlyCommitmentAmount));
        _memberContributions = memberContributions?.ToList() ?? [];
        if (_memberContributions.Any(x => x is null || x.Amount.Currency != Currency))
            throw new ArgumentException("Contributions must use the goal currency.", nameof(memberContributions));
        TargetDate = targetDate;
        Category = category;
        RefreshStatus();
    }

    public void AddContribution(SharedGoalContribution contribution)
    {
        ArgumentNullException.ThrowIfNull(contribution);
        if (Status != SharedGoalStatus.Active)
            throw new InvalidOperationException("Only active goals accept contributions.");
        if (contribution.Amount.Currency != Currency)
            throw new ArgumentException("Contribution must use the goal currency.", nameof(contribution));
        _memberContributions.Add(contribution);
        RefreshStatus();
    }

    public void Pause()
    {
        if (Status == SharedGoalStatus.Reached)
            throw new InvalidOperationException("A reached goal cannot be paused.");
        Status = SharedGoalStatus.Paused;
    }

    public void Resume() => RefreshStatus();

    private void RefreshStatus() => Status = CurrentAmount >= TargetAmount
        ? SharedGoalStatus.Reached
        : SharedGoalStatus.Active;
}
