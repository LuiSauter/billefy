using Api.Common;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Mvc;
using Notifications.Contracts;

namespace Api.Endpoints;

public static class NotificationEndpoints
{
    public static IEndpointRouteBuilder MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        MapNotificationGroup(app.MapGroup("/api/v1/notifications").WithTags("Notifications & Alerts").RequireAuthorization(), includeNames: true);
        MapNotificationGroup(app.MapGroup("/v1/notifications").WithTags("Notifications & Alerts").RequireAuthorization(), includeNames: false);

        return app;
    }

    private static void MapNotificationGroup(RouteGroupBuilder group, bool includeNames)
    {
        // 1. Register Device for Push Notifications (NOT-05)
        var regRoute = group.MapPost("/devices", async (
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
        .WithSummary("Registra un token FCM o APNs de dispositivo para notificaciones push (Regla NOT-05)");

        if (includeNames) regRoute.WithName("RegisterDevice");

        // 2. Get Notification History
        var histRoute = group.MapGet("/", async (
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
        .WithSummary("Obtiene el historial de notificaciones y alertas del usuario");

        if (includeNames) histRoute.WithName("GetNotificationHistory");

        // 3. Send Test Push Notification
        var testRoute = group.MapPost("/test", async (
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
        .WithSummary("Envía una notificación push de prueba a los dispositivos del usuario");

        if (includeNames) testRoute.WithName("SendTestPushNotification");
    }
}
