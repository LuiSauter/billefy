using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Notifications.Application.Abstractions;
using Notifications.Domain.Entities;
using WebPush;

namespace Notifications.Infrastructure;

public sealed class VapidWebPushGateway : IWebPushGateway
{
    private readonly WebPushClient _client = new();
    private readonly VapidOptions _options;

    public VapidWebPushGateway(IOptions<VapidOptions> options)
    {
        _options = options.Value;
    }

    public async Task<WebPushSendResult> SendAsync(
        WebPushSubscription subscription,
        string title,
        string body,
        Dictionary<string, string>? data = null,
        CancellationToken ct = default)
    {
        if (!_options.IsConfigured)
        {
            return WebPushSendResult.Failed;
        }

        var pushSubscription = new PushSubscription(subscription.Endpoint, subscription.P256dhKey, subscription.AuthKey);
        var vapidDetails = new VapidDetails(_options.Subject, _options.PublicKey, _options.PrivateKey);
        var payload = JsonSerializer.Serialize(new { title, body, data });

        try
        {
            await _client.SendNotificationAsync(pushSubscription, payload, vapidDetails, ct);
            return WebPushSendResult.Sent;
        }
        catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
        {
            return WebPushSendResult.SubscriptionExpired;
        }
        catch (WebPushException)
        {
            return WebPushSendResult.Failed;
        }
    }
}
