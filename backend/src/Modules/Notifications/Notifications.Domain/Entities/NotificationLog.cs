using BuildingBlocks.Common;

namespace Notifications.Domain.Entities;

public enum NotificationType
{
    Push = 1,
    Email = 2,
    InApp = 3
}

public sealed class NotificationLog : Entity
{
    private NotificationLog() : base()
    {
    }

    public NotificationLog(
        Guid id,
        Guid userId,
        NotificationType type,
        string channel,
        string title,
        string body,
        string status,
        string? errorDetails,
        DateTime createdAt)
        : base(id, userId, createdAt)
    {
        Type = type;
        Channel = channel.Trim();
        Title = title.Trim();
        Body = body.Trim();
        Status = status.Trim();
        ErrorDetails = errorDetails;
    }

    public NotificationType Type { get; private set; }
    public string Channel { get; private set; } = null!;
    public string Title { get; private set; } = null!;
    public string Body { get; private set; } = null!;
    public string Status { get; private set; } = "Sent";
    public string? ErrorDetails { get; private set; }

    public static NotificationLog CreateSuccess(
        Guid userId,
        NotificationType type,
        string channel,
        string title,
        string body,
        DateTime? now = null)
    {
        return new NotificationLog(
            Guid.NewGuid(),
            userId,
            type,
            channel,
            title,
            body,
            "Delivered",
            null,
            now ?? DateTime.UtcNow);
    }

    public static NotificationLog CreateFailed(
        Guid userId,
        NotificationType type,
        string channel,
        string title,
        string body,
        string errorDetails,
        DateTime? now = null)
    {
        return new NotificationLog(
            Guid.NewGuid(),
            userId,
            type,
            channel,
            title,
            body,
            "Failed",
            errorDetails,
            now ?? DateTime.UtcNow);
    }
}
