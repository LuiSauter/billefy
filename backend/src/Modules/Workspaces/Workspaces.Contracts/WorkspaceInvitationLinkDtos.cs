namespace Workspaces.Contracts;

public sealed record IssueWorkspaceInvitationLinkResponse(Guid Id, string Token, DateTime ExpiresAt);

public sealed record PreviewWorkspaceInvitationLinkRequest(string? Token);

public sealed record AcceptWorkspaceInvitationLinkRequest(string? Token);

public sealed record AcceptWorkspaceInvitationLinkResponse(Guid WorkspaceId, Guid MembershipId);

public sealed record WorkspaceInvitationLinkPreviewDto(
    Guid WorkspaceId,
    string WorkspaceName,
    WorkspaceRole WorkspaceRole,
    DateTime ExpiresAt,
    bool AlreadyMember);
