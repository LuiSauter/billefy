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
            if (!currentUser.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var result = await notificationsModule.RegisterDeviceAsync(currentUser.UserId!.Value, request, ct);
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
            if (!currentUser.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var result = await notificationsModule.GetNotificationHistoryAsync(currentUser.UserId!.Value, ct);
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
            if (!currentUser.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var result = await notificationsModule.SendPushNotificationAsync(currentUser.UserId!.Value, request, ct);
            return result.ToHttpResult();
        })
        .WithName("SendTestPushNotification")
        .WithSummary("Envía una notificación push de prueba a los dispositivos del usuario");

        return app;
    }
}
