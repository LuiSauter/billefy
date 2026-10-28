using BuildingBlocks.Common;

namespace Identity.Domain.Entities;

public sealed class RefreshToken : Entity
{
    private RefreshToken() : base()
    {
    }

    public RefreshToken(
        Guid id,
        Guid userId,
        string token,
        DateTime expiresAt,
        DateTime createdAt)
        : base(id, userId, createdAt)
    {
        Token = token;
        ExpiresAt = expiresAt;
    }

    public string Token { get; private set; } = null!;
    public DateTime ExpiresAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }
    public string? ReplacedByToken { get; private set; }

    public bool IsExpired(DateTime now) => now >= ExpiresAt;
    public bool IsRevoked => RevokedAt != null;
    public bool IsActive(DateTime now) => !IsRevoked && !IsExpired(now);

    public static RefreshToken Create(Guid userId, string token, DateTime expiresAt, DateTime? now = null)
    {
        return new RefreshToken(
            Guid.NewGuid(),
            userId,
            token,
            expiresAt,
            now ?? DateTime.UtcNow);
    }

    public void Revoke(string? replacedByToken, DateTime now)
    {
        RevokedAt = now;
        ReplacedByToken = replacedByToken;
    }
}
