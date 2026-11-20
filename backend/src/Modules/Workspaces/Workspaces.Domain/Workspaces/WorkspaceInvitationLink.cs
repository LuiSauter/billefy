namespace Workspaces.Domain.Workspaces;

public sealed class WorkspaceInvitationLink
{
    public Guid Id { get; private set; }
    public Guid WorkspaceId { get; private set; }
    public Guid IssuerMemberId { get; private set; }
    public string TokenHash { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }
    public DateTime? ConsumedAt { get; private set; }
    public Guid? ConsumedByUserId { get; private set; }
    public int Version { get; private set; } = 1;

    private WorkspaceInvitationLink() { }

    public WorkspaceInvitationLink(Guid id, Guid workspaceId, Guid issuerMemberId, string tokenHash,
        DateTime createdAt, DateTime expiresAt)
    {
        if (id == Guid.Empty) throw new ArgumentException("A non-empty ID is required.", nameof(id));
        if (workspaceId == Guid.Empty) throw new ArgumentException("A non-empty workspace ID is required.", nameof(workspaceId));
        if (issuerMemberId == Guid.Empty) throw new ArgumentException("A non-empty issuer member ID is required.", nameof(issuerMemberId));
        if (string.IsNullOrWhiteSpace(tokenHash) || tokenHash.Length != 64 || tokenHash.Any(c => !Uri.IsHexDigit(c)))
            throw new ArgumentException("A SHA-256 hexadecimal token hash is required.", nameof(tokenHash));
        if (createdAt.Kind != DateTimeKind.Utc || expiresAt.Kind != DateTimeKind.Utc || expiresAt <= createdAt)
            throw new ArgumentException("The link expiry must follow its UTC creation time.", nameof(expiresAt));

        Id = id;
        WorkspaceId = workspaceId;
        IssuerMemberId = issuerMemberId;
        TokenHash = tokenHash.ToLowerInvariant();
        CreatedAt = createdAt;
        ExpiresAt = expiresAt;
    }

    public void Consume(Guid userId, DateTime now)
    {
        if (userId == Guid.Empty) throw new ArgumentException("A non-empty user ID is required.", nameof(userId));
        EnsureUsable(now);
        ConsumedAt = now;
        ConsumedByUserId = userId;
        IncrementVersion();
    }

    public void Revoke(DateTime now)
    {
        EnsureUsable(now);
        RevokedAt = now;
        IncrementVersion();
    }

    public bool IsUsableAt(DateTime now)
    {
        if (now.Kind != DateTimeKind.Utc) throw new ArgumentException("Current time must be UTC.", nameof(now));
        return now < ExpiresAt && RevokedAt is null && ConsumedAt is null;
    }

    private void EnsureUsable(DateTime now)
    {
        if (now.Kind != DateTimeKind.Utc) throw new ArgumentException("Current time must be UTC.", nameof(now));
        if (!IsUsableAt(now)) throw new InvalidOperationException("The invitation link is no longer usable.");
    }

    private void IncrementVersion()
    {
        if (Version == int.MaxValue) throw new InvalidOperationException("Invitation link version is exhausted.");
        Version++;
    }
}
