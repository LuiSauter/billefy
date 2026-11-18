using Notifications.Domain.Entities;

namespace Notifications.Application.Abstractions;

public interface IDeviceTokenRepository
{
    Task<IReadOnlyList<DeviceToken>> GetActiveByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<DeviceToken?> GetByTokenAsync(string token, CancellationToken ct = default);
    Task AddAsync(DeviceToken token, CancellationToken ct = default);
    void Update(DeviceToken token);
}

public interface IWebPushSubscriptionRepository
{
    Task<IReadOnlyList<WebPushSubscription>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<WebPushSubscription?> GetByEndpointAsync(string endpoint, CancellationToken ct = default);
    Task AddAsync(WebPushSubscription subscription, CancellationToken ct = default);
    void Remove(WebPushSubscription subscription);
}

public interface INotificationLogRepository
{
    Task<IReadOnlyList<NotificationLog>> GetByUserIdAsync(Guid userId, int limit = 50, CancellationToken ct = default);
    Task AddAsync(NotificationLog log, CancellationToken ct = default);
}

public interface IPushGateway
{
    Task<bool> SendPushAsync(string token, string title, string body, Dictionary<string, string>? data = null, CancellationToken ct = default);
}

public interface IWebPushGateway
{
    Task<WebPushSendResult> SendAsync(WebPushSubscription subscription, string title, string body, Dictionary<string, string>? data = null, CancellationToken ct = default);
}

public enum WebPushSendResult
{
    Sent,
    Failed,
    SubscriptionExpired
}

public interface IEmailGateway
{
    Task<bool> SendEmailAsync(string toEmail, string subject, string body, CancellationToken ct = default);
}

public interface INotificationsUnitOfWork
{
    Task<int> CommitAsync(CancellationToken ct = default);
}
