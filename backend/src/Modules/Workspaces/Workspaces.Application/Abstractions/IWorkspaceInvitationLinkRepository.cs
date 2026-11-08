namespace Workspaces.Application.Abstractions;

public enum AcceptWorkspaceInvitationLinkStatus
{
    Accepted,
    InvalidLink,
    Conflict
}

public sealed record AcceptWorkspaceInvitationLinkResult(AcceptWorkspaceInvitationLinkStatus Status, Guid WorkspaceId, Guid MembershipId);

public enum RevokeWorkspaceInvitationLinkStatus
{
    RevokedOrAlreadyUnusable,
    InvalidLink,
    Forbidden,
    Conflict
}

public interface IWorkspaceInvitationLinkRepository
{
    Task<AcceptWorkspaceInvitationLinkResult> AcceptAsync(string tokenHash, Guid userId, DateTime now, CancellationToken ct);
    Task<RevokeWorkspaceInvitationLinkStatus> RevokeAsync(Guid workspaceId, Guid linkId, Guid userId, DateTime now, CancellationToken ct);
}
