using System.Data;
using System.Data.Common;
using BuildingBlocks.Security;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure;

internal sealed class WorkspaceInvitationLinkRepository(
    DbContextOptions<WorkspacesDbContext> options,
    ICurrentUserContext currentUser) : IWorkspaceInvitationLinkRepository
{
    private const int MaxAttempts = 5;

    public async Task<AcceptWorkspaceInvitationLinkResult> AcceptAsync(
        string tokenHash, Guid userId, DateTime now, CancellationToken ct)
    {
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                await using var db = new WorkspacesDbContext(options, currentUser);
                await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                var link = await db.WorkspaceInvitationLinks.SingleOrDefaultAsync(x => x.TokenHash == tokenHash, ct);
                if (link is null)
                    return InvalidAccept();

                var workspace = await db.Workspaces.SingleOrDefaultAsync(x => x.Id == link.WorkspaceId && x.IsActive, ct);
                if (workspace is null)
                    return InvalidAccept();

                var existingMember = await db.WorkspaceMembers.SingleOrDefaultAsync(x =>
                    x.WorkspaceId == link.WorkspaceId && x.UserId == userId, ct);

                if (link.ConsumedAt is not null)
                {
                    if (link.ConsumedByUserId != userId || existingMember is not { IsActive: true })
                        return InvalidAccept();
                    await transaction.CommitAsync(ct);
                    return new(AcceptWorkspaceInvitationLinkStatus.Accepted, link.WorkspaceId, existingMember.Id);
                }

                var issuer = await db.WorkspaceMembers.SingleOrDefaultAsync(x =>
                    x.Id == link.IssuerMemberId && x.WorkspaceId == link.WorkspaceId && x.IsActive, ct);
                if (issuer is null || !issuer.CanManage || !link.IsUsableAt(now) || existingMember is { IsActive: false })
                    return InvalidAccept();

                var membershipId = existingMember?.Id ?? Guid.NewGuid();
                if (existingMember is null)
                {
                    db.WorkspaceMembers.Add(new WorkspaceMember(membershipId, link.WorkspaceId, userId,
                        WorkspaceRole.Member, 0m, now, 0m, 1m));
                }

                link.Consume(userId, now);
                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
                return new(AcceptWorkspaceInvitationLinkStatus.Accepted, link.WorkspaceId, membershipId);
            }
            catch (Exception exception) when (IsRetryable(exception))
            {
                if (attempt == MaxAttempts)
                    return new(AcceptWorkspaceInvitationLinkStatus.Conflict, Guid.Empty, Guid.Empty);
                await Task.Delay(TimeSpan.FromMilliseconds(10 * attempt), ct);
            }
        }

        return new(AcceptWorkspaceInvitationLinkStatus.Conflict, Guid.Empty, Guid.Empty);
    }

    public async Task<RevokeWorkspaceInvitationLinkStatus> RevokeAsync(
        Guid workspaceId, Guid linkId, Guid userId, DateTime now, CancellationToken ct)
    {
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                await using var db = new WorkspacesDbContext(options, currentUser);
                await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                var workspace = await db.Workspaces.SingleOrDefaultAsync(x => x.Id == workspaceId && x.IsActive, ct);
                if (workspace is null)
                    return RevokeWorkspaceInvitationLinkStatus.InvalidLink;

                var manager = await db.WorkspaceMembers.SingleOrDefaultAsync(x =>
                    x.WorkspaceId == workspaceId && x.UserId == userId && x.IsActive, ct);
                if (manager is null || !manager.CanManage)
                    return RevokeWorkspaceInvitationLinkStatus.Forbidden;

                var link = await db.WorkspaceInvitationLinks.SingleOrDefaultAsync(x =>
                    x.Id == linkId && x.WorkspaceId == workspaceId, ct);
                if (link is null)
                    return RevokeWorkspaceInvitationLinkStatus.InvalidLink;
                if (!link.IsUsableAt(now))
                {
                    await transaction.CommitAsync(ct);
                    return RevokeWorkspaceInvitationLinkStatus.RevokedOrAlreadyUnusable;
                }

                link.Revoke(now);
                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
                return RevokeWorkspaceInvitationLinkStatus.RevokedOrAlreadyUnusable;
            }
            catch (Exception exception) when (IsRetryable(exception))
            {
                if (attempt == MaxAttempts)
                    return RevokeWorkspaceInvitationLinkStatus.Conflict;
                await Task.Delay(TimeSpan.FromMilliseconds(10 * attempt), ct);
            }
        }

        return RevokeWorkspaceInvitationLinkStatus.Conflict;
    }

    private static AcceptWorkspaceInvitationLinkResult InvalidAccept() =>
        new(AcceptWorkspaceInvitationLinkStatus.InvalidLink, Guid.Empty, Guid.Empty);

    private static bool IsRetryable(Exception exception)
    {
        if (exception is DbUpdateConcurrencyException)
            return true;
        if (IsSqliteCode(exception, 5, 6, 19))
            return true;
        if (exception is PostgresException postgres)
            return postgres.SqlState is PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected ||
                postgres.SqlState == PostgresErrorCodes.UniqueViolation &&
                postgres.ConstraintName == "ix_workspace_members_workspace_id_user_id";
        if (exception is DbUpdateException { InnerException: PostgresException inner })
            return inner.SqlState is PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected ||
                inner.SqlState == PostgresErrorCodes.UniqueViolation &&
                inner.ConstraintName == "ix_workspace_members_workspace_id_user_id";
        return exception is DbUpdateException update && IsSqliteCode(update.InnerException, 5, 6, 19);
    }

    private static bool IsSqliteCode(Exception? exception, params int[] codes)
    {
        if (exception is not DbException ||
            exception.GetType().FullName != "Microsoft.Data.Sqlite.SqliteException")
            return false;
        var sqliteCode = exception.GetType().GetProperty("SqliteErrorCode")?.GetValue(exception);
        return sqliteCode is int code && codes.Contains(code);
    }
}
