using BuildingBlocks.Common;

namespace Notifications.Domain.Entities;

public sealed class WebPushSubscription : Entity
{
    private WebPushSubscription() : base()
    {
    }

    public WebPushSubscription(Guid id, Guid userId, string endpoint, string p256dhKey, string authKey, DateTime createdAt)
        : base(id, userId, createdAt)
    {
        Endpoint = endpoint.Trim();
        P256dhKey = p256dhKey.Trim();
        AuthKey = authKey.Trim();
    }

    public string Endpoint { get; private set; } = null!;
    public string P256dhKey { get; private set; } = null!;
    public string AuthKey { get; private set; } = null!;

    public static Result<WebPushSubscription> Create(Guid userId, string endpoint, string p256dhKey, string authKey, DateTime? now = null)
    {
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            return Result.Failure<WebPushSubscription>(Error.Validation("WebPushSubscription.EmptyEndpoint", "El endpoint de la suscripción no puede estar vacío."));
        }

        if (string.IsNullOrWhiteSpace(p256dhKey) || string.IsNullOrWhiteSpace(authKey))
        {
            return Result.Failure<WebPushSubscription>(Error.Validation("WebPushSubscription.MissingKeys", "La suscripción debe incluir las claves p256dh y auth."));
        }

        var entity = new WebPushSubscription(Guid.NewGuid(), userId, endpoint, p256dhKey, authKey, now ?? DateTime.UtcNow);
        return Result.Success(entity);
    }
}
