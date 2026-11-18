namespace Notifications.Contracts;

public sealed record RegisterDeviceTokenRequest(
    string Token,
    string Platform);

public sealed record DeviceRegistrationDto(
    Guid Id,
    string Platform,
    DateTime CreatedAt);

public sealed record SubscribeWebPushRequest(
    string Endpoint,
    string P256dhKey,
    string AuthKey);

public sealed record PushNotificationMessage(
    string Title,
    string Body,
    Dictionary<string, string>? Data = null);

public sealed record SendEmailRequest(
    string ToEmail,
    string Subject,
    string Body);

public sealed record NotificationLogDto(
    Guid Id,
    string Type,
    string Channel,
    string Title,
    string Body,
    DateTime SentAt,
    string Status);
