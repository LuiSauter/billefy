using System.Net.Mail;
using Workspaces.Contracts;
using Workspaces.Domain.Common;

namespace Workspaces.Domain.Workspaces;

public sealed class WorkspaceInvitation
{
    public Guid Id { get; }
    public Guid WorkspaceId { get; }
    public string InvitedEmail { get; }
    public string Token { get; }
    public WorkspaceRole WorkspaceRole { get; }
    public DateTime ExpiresAt { get; }
    public InvitationStatus Status { get; private set; } = InvitationStatus.Pending;
    public decimal PlannedIncomeSharePercentage { get; private set; }
    public decimal PlannedCustomSharePercentage { get; private set; }
    public decimal PlannedResponsibilityWeight { get; private set; } = 1m;

    private WorkspaceInvitation()
    {
        InvitedEmail = null!;
        Token = null!;
    }

    public WorkspaceInvitation(Guid id, Guid workspaceId, string invitedEmail, string token,
        WorkspaceRole workspaceRole, DateTime expiresAt, decimal plannedIncomeSharePercentage = 0m,
        decimal plannedCustomSharePercentage = 0m, decimal plannedResponsibilityWeight = 1m)
    {
        Id = DomainGuard.Id(id, nameof(id));
        WorkspaceId = DomainGuard.Id(workspaceId, nameof(workspaceId));
        InvitedEmail = DomainGuard.Text(invitedEmail, nameof(invitedEmail));
        if (!MailAddress.TryCreate(InvitedEmail, out var address) || address.Address != InvitedEmail)
            throw new ArgumentException("A valid email address is required.", nameof(invitedEmail));
        Token = DomainGuard.Text(token, nameof(token));
        WorkspaceRole = DomainGuard.Defined(workspaceRole, nameof(workspaceRole));
        if (workspaceRole == WorkspaceRole.Owner)
            throw new ArgumentException("Invitations cannot grant ownership.", nameof(workspaceRole));
        ExpiresAt = expiresAt;
        SetPlannedSplitConfiguration(plannedIncomeSharePercentage, plannedCustomSharePercentage, plannedResponsibilityWeight);
    }

    public void SetPlannedSplitConfiguration(decimal income, decimal custom, decimal weight)
    {
        PlannedIncomeSharePercentage = Share(income, nameof(income));
        PlannedCustomSharePercentage = Share(custom, nameof(custom));
        PlannedResponsibilityWeight = weight < 0m || weight > 99999999999999.999999m ||
            weight != decimal.Round(weight, 6, MidpointRounding.ToZero)
            ? throw new ArgumentOutOfRangeException(nameof(weight), "Weight must be non-negative and have at most six decimal places.") : weight;
    }

    private static decimal Share(decimal value, string name) =>
        DomainGuard.Percentage(value, name) == decimal.Round(value, 6, MidpointRounding.ToZero)
            ? value : throw new ArgumentOutOfRangeException(name, "Share precision cannot exceed six decimal places.");

    public void Accept(DateTime now)
    {
        EnsurePending();
        if (now >= ExpiresAt)
            throw new InvalidOperationException("Invitation has expired.");
        Status = InvitationStatus.Accepted;
    }

    public void Reject()
    {
        EnsurePending();
        Status = InvitationStatus.Rejected;
    }

    public void Cancel()
    {
        EnsurePending();
        Status = InvitationStatus.Cancelled;
    }

    private void EnsurePending()
    {
        if (Status != InvitationStatus.Pending)
            throw new InvalidOperationException("Invitation is no longer pending.");
    }
}
