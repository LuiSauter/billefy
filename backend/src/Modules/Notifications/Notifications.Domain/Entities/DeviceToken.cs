using BuildingBlocks.Common;

namespace Notifications.Domain.Entities;

public sealed class DeviceToken : Entity
{
    private DeviceToken() : base()
    {
    }

    public DeviceToken(Guid id, Guid userId, string token, string platform, DateTime createdAt)
        : base(id, userId, createdAt)
    {
        Token = token.Trim();
        Platform = platform.Trim();
        LastActiveAt = createdAt;
        IsActive = true;
    }

    public string Token { get; private set; } = null!;
    public string Platform { get; private set; } = null!;
    public DateTime LastActiveAt { get; private set; }
    public bool IsActive { get; private set; }

    public static Result<DeviceToken> Create(Guid userId, string token, string platform, DateTime? now = null)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return Result.Failure<DeviceToken>(Error.Validation("DeviceToken.EmptyToken", "El token del dispositivo no puede estar vacío."));
        }

        var normalizedPlatform = string.IsNullOrWhiteSpace(platform) ? "Android" : platform.Trim();
        var entity = new DeviceToken(Guid.NewGuid(), userId, token, normalizedPlatform, now ?? DateTime.UtcNow);
        return Result.Success(entity);
    }

    public void Touch(DateTime now)
    {
        LastActiveAt = now;
        IsActive = true;
    }

    public void Deactivate()
    {
        IsActive = false;
    }
}
