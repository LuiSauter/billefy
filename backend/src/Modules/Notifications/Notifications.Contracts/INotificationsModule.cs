using BuildingBlocks.Common;

namespace Notifications.Contracts;

public interface INotificationsModule
{
    Task<Result<DeviceRegistrationDto>> RegisterDeviceAsync(Guid userId, RegisterDeviceTokenRequest req, CancellationToken ct = default);
    Task<Result> SendPushNotificationAsync(Guid userId, PushNotificationMessage message, CancellationToken ct = default);
    Task<Result> SendEmailNotificationAsync(SendEmailRequest request, CancellationToken ct = default);
    Task<Result<IReadOnlyList<NotificationLogDto>>> GetNotificationHistoryAsync(Guid userId, CancellationToken ct = default);
    Task<Result> NotifyBudgetThresholdExceededAsync(Guid userId, string category, decimal spent, decimal limit, decimal threshold, CancellationToken ct = default);
    Task<Result> NotifyLoanInstallmentDueAsync(Guid userId, string counterparty, decimal amount, string currency, DateTime dueDate, CancellationToken ct = default);
}
