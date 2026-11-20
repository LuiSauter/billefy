using System.Security.Cryptography;
using System.Text;
using BuildingBlocks.Common;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Workspaces;
using static Workspaces.Application.Services.WorkspaceAccess;

namespace Workspaces.Application.Services;

public interface IWorkspaceInvitationLinkService
{
    Task<Result<IssueWorkspaceInvitationLinkResponse>> IssueAsync(Guid workspaceId, CancellationToken ct = default);
    Task<Result<WorkspaceInvitationLinkPreviewDto>> PreviewAsync(string? token, CancellationToken ct = default);
    Task<Result<AcceptWorkspaceInvitationLinkResponse>> AcceptAsync(string? token, CancellationToken ct = default);
    Task<Result> RevokeAsync(Guid workspaceId, Guid linkId, CancellationToken ct = default);
}

public sealed class WorkspaceInvitationLinkService(
    IWorkspaceRepository repository,
    IWorkspaceInvitationLinkRepository invitationLinks,
    WorkspaceAccess access) : IWorkspaceInvitationLinkService
{
    public Task<Result<IssueWorkspaceInvitationLinkResponse>> IssueAsync(Guid workspaceId, CancellationToken ct = default) =>
        access.WriteAsync(async () =>
        {
            var (workspace, issuer) = await access.RequireAsync(workspaceId, ct, manage: true);
            var secretBytes = RandomNumberGenerator.GetBytes(32);
            var token = Convert.ToBase64String(secretBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
            var hash = Hash(token);
            var createdAt = access.Now;
            var expiresAt = createdAt.AddDays(7);
            var link = new WorkspaceInvitationLink(Guid.NewGuid(), workspace.Id, issuer.Id, hash, createdAt, expiresAt);
            repository.Add(link);
            return new IssueWorkspaceInvitationLinkResponse(link.Id, token, link.ExpiresAt);
        }, ct);

    public Task<Result<AcceptWorkspaceInvitationLinkResponse>> AcceptAsync(string? token, CancellationToken ct = default) =>
        ReadAsync(async () =>
        {
            if (!TryHash(token, out var tokenHash)) throw Missing();
            var result = await invitationLinks.AcceptAsync(tokenHash, access.UserId, access.Now, ct);
            return result.Status switch
            {
                AcceptWorkspaceInvitationLinkStatus.Accepted => new AcceptWorkspaceInvitationLinkResponse(result.WorkspaceId, result.MembershipId),
                AcceptWorkspaceInvitationLinkStatus.InvalidLink => throw Missing(),
                _ => throw new WorkspaceFailure(Error.Conflict("Workspace.InvitationLinkConflict", "The invitation link could not be accepted. Retry the request."))
            };
        });

    public Task<Result> RevokeAsync(Guid workspaceId, Guid linkId, CancellationToken ct = default) =>
        RevokeResultAsync(workspaceId, linkId, ct);

    private async Task<Result> RevokeResultAsync(Guid workspaceId, Guid linkId, CancellationToken ct)
    {
        try
        {
            var status = await invitationLinks.RevokeAsync(workspaceId, linkId, access.UserId, access.Now, ct);
            return status switch
            {
                RevokeWorkspaceInvitationLinkStatus.RevokedOrAlreadyUnusable => Result.Success(),
                RevokeWorkspaceInvitationLinkStatus.InvalidLink => Result.Failure(Error.NotFound("Workspace.NotFound", "Workspace resource not found.")),
                RevokeWorkspaceInvitationLinkStatus.Forbidden => Result.Failure(Error.Forbidden("Workspace.Forbidden", "A workspace owner or administrator is required.")),
                _ => Result.Failure(Error.Conflict("Workspace.InvitationLinkConflict", "The invitation link could not be revoked. Retry the request."))
            };
        }
        catch (WorkspaceFailure ex)
        {
            return Result.Failure(ex.Error);
        }
    }

    public Task<Result<WorkspaceInvitationLinkPreviewDto>> PreviewAsync(string? token, CancellationToken ct = default) =>
        ReadAsync(async () =>
        {
            if (!TryHash(token, out var tokenHash)) throw Missing();
            var link = (await repository.ListAsync<WorkspaceInvitationLink>(x => x.TokenHash == tokenHash, ct)).SingleOrDefault();
            if (link is null || !link.IsUsableAt(access.Now)) throw Missing();

            var workspace = (await repository.ListAsync<Workspace>(x => x.Id == link.WorkspaceId && x.IsActive, ct)).SingleOrDefault();
            if (workspace is null) throw Missing();
            var issuer = (await repository.ListAsync<WorkspaceMember>(x => x.Id == link.IssuerMemberId &&
                x.WorkspaceId == link.WorkspaceId && x.IsActive, ct)).SingleOrDefault();
            if (issuer is null || !issuer.CanManage) throw Missing();

            var userId = access.UserId;
            var alreadyMember = (await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == link.WorkspaceId &&
                x.UserId == userId && x.IsActive, ct)).Count != 0;
            return new WorkspaceInvitationLinkPreviewDto(workspace.Id, workspace.Name, WorkspaceRole.Member,
                link.ExpiresAt, alreadyMember);
        });

    private static bool TryHash(string? token, out string hash)
    {
        hash = string.Empty;
        if (token is null || token.Length != 43) return false;
        foreach (var character in token)
        {
            if (!(character is >= 'A' and <= 'Z' or >= 'a' and <= 'z' or >= '0' and <= '9' or '-' or '_'))
                return false;
        }

        try
        {
            var decoded = Convert.FromBase64String(token.Replace('-', '+').Replace('_', '/') + "=");
            if (decoded.Length != 32) return false;
            var canonical = Convert.ToBase64String(decoded).TrimEnd('=').Replace('+', '-').Replace('/', '_');
            if (!string.Equals(canonical, token, StringComparison.Ordinal)) return false;
        }
        catch (FormatException)
        {
            return false;
        }

        hash = Hash(token);
        return true;
    }

    private static string Hash(string token) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
