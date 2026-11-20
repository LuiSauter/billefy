using Workspaces.Contracts;
using Workspaces.Domain.Common;

namespace Workspaces.Domain.Workspaces;

public sealed class WorkspaceMember
{
    public Guid Id { get; }
    public Guid WorkspaceId { get; }
    public Guid UserId { get; }
    public WorkspaceRole WorkspaceRole { get; private set; }
    public decimal IncomeSharePercentage { get; private set; }
    public decimal DefaultCustomSharePercentage { get; private set; }
    public decimal DefaultResponsibilityWeight { get; private set; } = 1m;
    public DateTime JoinedAt { get; }
    public bool IsActive { get; private set; } = true;

    private WorkspaceMember() { }

    public WorkspaceMember(Guid id, Guid workspaceId, Guid userId, WorkspaceRole workspaceRole,
        decimal incomeSharePercentage, DateTime joinedAt, decimal defaultCustomSharePercentage = 0m,
        decimal defaultResponsibilityWeight = 1m)
    {
        Id = DomainGuard.Id(id, nameof(id));
        WorkspaceId = DomainGuard.Id(workspaceId, nameof(workspaceId));
        UserId = DomainGuard.Id(userId, nameof(userId));
        WorkspaceRole = DomainGuard.Defined(workspaceRole, nameof(workspaceRole));
        IncomeSharePercentage = Share(incomeSharePercentage, nameof(incomeSharePercentage));
        DefaultCustomSharePercentage = Share(defaultCustomSharePercentage, nameof(defaultCustomSharePercentage));
        DefaultResponsibilityWeight = Weight(defaultResponsibilityWeight, nameof(defaultResponsibilityWeight));
        JoinedAt = joinedAt;
    }

    public void SetSplitConfiguration(decimal income, decimal custom, decimal weight)
    {
        IncomeSharePercentage = Share(income, nameof(income));
        DefaultCustomSharePercentage = Share(custom, nameof(custom));
        DefaultResponsibilityWeight = Weight(weight, nameof(weight));
    }

    private static decimal Share(decimal value, string name) =>
        DomainGuard.Percentage(value, name) == decimal.Round(value, 6, MidpointRounding.ToZero)
            ? value : throw new ArgumentOutOfRangeException(name, "Share precision cannot exceed six decimal places.");

    private static decimal Weight(decimal value, string name) => value < 0m || value > 99999999999999.999999m ||
        value != decimal.Round(value, 6, MidpointRounding.ToZero)
            ? throw new ArgumentOutOfRangeException(name, "Weight must be non-negative and have at most six decimal places.") : value;

    public bool CanManage => IsActive && WorkspaceRole is WorkspaceRole.Owner or WorkspaceRole.Admin;

    public void ChangeRole(WorkspaceRole role)
    {
        DomainGuard.Defined(role, nameof(role));
        if (!IsActive)
            throw new InvalidOperationException("Inactive members cannot change roles.");
        if (role == WorkspaceRole)
            return;
        if (WorkspaceRole == WorkspaceRole.Owner || role == WorkspaceRole.Owner)
            throw new InvalidOperationException("Ownership cannot be changed through member role updates.");
        WorkspaceRole = role;
    }

    public void Deactivate()
    {
        if (WorkspaceRole == WorkspaceRole.Owner)
            throw new InvalidOperationException("The workspace owner cannot be deactivated.");
        IsActive = false;
    }
}
