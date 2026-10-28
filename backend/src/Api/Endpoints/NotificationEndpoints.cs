using Api.Common;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Mvc;
using Notifications.Contracts;

namespace Api.Endpoints;

public static class NotificationEndpoints
{
    public static IEndpointRouteBuilder MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/notifications")
            .WithTags("Notifications & Alerts");

        // 1. Register Device for Push Notifications (NOT-05)
        group.MapPost("/devices", async (
            [FromBody] RegisterDeviceTokenRequest request,
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] INotificationsModule notificationsModule,
            CancellationToken ct) =>
        {
            var userId = currentUser.UserId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
            var result = await notificationsModule.RegisterDeviceAsync(userId, request, ct);
            return result.ToHttpResult();
        })
        .WithName("RegisterDevice")
        .WithSummary("Registra un token FCM o APNs de dispositivo para notificaciones push (Regla NOT-05)");

        // 2. Get Notification History
        group.MapGet("/", async (
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] INotificationsModule notificationsModule,
            CancellationToken ct) =>
        {
            var userId = currentUser.UserId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
            var result = await notificationsModule.GetNotificationHistoryAsync(userId, ct);
            return result.ToHttpResult();
        })
        .WithName("GetNotificationHistory")
        .WithSummary("Obtiene el historial de notificaciones y alertas del usuario");

        // 3. Send Test Push Notification
        group.MapPost("/test", async (
            [FromBody] PushNotificationMessage request,
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] INotificationsModule notificationsModule,
            CancellationToken ct) =>
        {
            var userId = currentUser.UserId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
            var result = await notificationsModule.SendPushNotificationAsync(userId, request, ct);
            return result.ToHttpResult();
        })
        .WithName("SendTestPushNotification")
        .WithSummary("Envía una notificación push de prueba a los dispositivos del usuario");

        return app;
    }
}
