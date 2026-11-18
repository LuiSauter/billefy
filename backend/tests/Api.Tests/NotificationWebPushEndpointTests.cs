using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Notifications.Application.Abstractions;
using Notifications.Contracts;
using Notifications.Domain.Entities;
using Notifications.Infrastructure;

namespace Api.Tests;

public sealed class NotificationWebPushEndpointTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly Guid _user = Guid.NewGuid();
    private readonly Guid _otherUser = Guid.NewGuid();
    private readonly ConfigurableWebPushGateway _gateway = new();

    public NotificationWebPushEndpointTests()
    {
        _factory = new CustomWebApplicationFactory(configureServices: services =>
        {
            services.AddSingleton<IWebPushGateway>(_gateway);
        });
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [Theory]
    [InlineData("/v1/notifications/web-push/subscribe")]
    [InlineData("/api/v1/notifications/web-push/subscribe")]
    public async Task Subscribe_AuthenticatedUser_PersistsSubscriptionAndReturnsOk(string route)
    {
        using var response = await Send(HttpMethod.Post, route, _user, new SubscribeWebPushRequest("https://push.test/browser-1", "p256dh-1", "auth-1"));

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var stored = (await Subscriptions()).Should().ContainSingle().Subject;
        stored.UserId.Should().Be(_user);
        stored.Endpoint.Should().Be("https://push.test/browser-1");
        stored.P256dhKey.Should().Be("p256dh-1");
        stored.AuthKey.Should().Be("auth-1");
    }

    [Fact]
    public async Task Subscribe_WithoutUserId_ReturnsUnauthorizedAndStoresNothing()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/notifications/web-push/subscribe")
        {
            Content = JsonContent.Create(new SubscribeWebPushRequest("https://push.test/browser-1", "p", "a"))
        };
        using var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await Subscriptions()).Should().BeEmpty();
    }

    [Fact]
    public async Task Subscribe_RepeatedForSameUser_DoesNotDuplicate()
    {
        var body = new SubscribeWebPushRequest("https://push.test/browser-1", "p", "a");
        using var first = await Send(HttpMethod.Post, "/v1/notifications/web-push/subscribe", _user, body);
        using var second = await Send(HttpMethod.Post, "/v1/notifications/web-push/subscribe", _user, body);

        first.StatusCode.Should().Be(HttpStatusCode.NoContent);
        second.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await Subscriptions()).Should().ContainSingle();
    }

    [Fact]
    public async Task Subscribe_EndpointFromAnotherUser_ReassignsToCurrentUser()
    {
        using var first = await Send(HttpMethod.Post, "/v1/notifications/web-push/subscribe", _user,
            new SubscribeWebPushRequest("https://push.test/shared-browser", "p-old", "a-old"));
        using var second = await Send(HttpMethod.Post, "/v1/notifications/web-push/subscribe", _otherUser,
            new SubscribeWebPushRequest("https://push.test/shared-browser", "p-new", "a-new"));

        second.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var stored = (await Subscriptions()).Should().ContainSingle().Subject;
        stored.UserId.Should().Be(_otherUser);
        stored.P256dhKey.Should().Be("p-new");
    }

    [Fact]
    public async Task Subscribe_MissingKeys_ReturnsBadRequestAndStoresNothing()
    {
        using var response = await Send(HttpMethod.Post, "/v1/notifications/web-push/subscribe", _user,
            new SubscribeWebPushRequest("https://push.test/browser-1", "", ""));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Subscriptions()).Should().BeEmpty();
    }

    [Theory]
    [InlineData("/v1/notifications/web-push/subscribe")]
    [InlineData("/api/v1/notifications/web-push/subscribe")]
    public async Task Unsubscribe_OwnEndpoint_RemovesSubscription(string route)
    {
        using var subscribe = await Send(HttpMethod.Post, route, _user, new SubscribeWebPushRequest("https://push.test/browser-1", "p", "a"));
        subscribe.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var response = await Send(HttpMethod.Delete, $"{route}?endpoint={Uri.EscapeDataString("https://push.test/browser-1")}", _user);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await Subscriptions()).Should().BeEmpty();
    }

    [Fact]
    public async Task Unsubscribe_EndpointOwnedByAnotherUser_ReturnsOkWithoutRemoving()
    {
        using var subscribe = await Send(HttpMethod.Post, "/v1/notifications/web-push/subscribe", _user,
            new SubscribeWebPushRequest("https://push.test/browser-1", "p", "a"));
        subscribe.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var response = await Send(HttpMethod.Delete,
            $"/v1/notifications/web-push/subscribe?endpoint={Uri.EscapeDataString("https://push.test/browser-1")}", _otherUser);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await Subscriptions()).Should().ContainSingle().Which.UserId.Should().Be(_user);
    }

    [Fact]
    public async Task Unsubscribe_WithoutUserId_ReturnsUnauthorized()
    {
        using var request = new HttpRequestMessage(HttpMethod.Delete,
            $"/v1/notifications/web-push/subscribe?endpoint={Uri.EscapeDataString("https://push.test/browser-1")}");
        using var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SendTestPush_DeliversToWebPushSubscriptionAndRemovesExpiredOnes()
    {
        using var alive = await Send(HttpMethod.Post, "/v1/notifications/web-push/subscribe", _user,
            new SubscribeWebPushRequest("https://push.test/alive", "p1", "a1"));
        using var dead = await Send(HttpMethod.Post, "/v1/notifications/web-push/subscribe", _user,
            new SubscribeWebPushRequest("https://push.test/dead", "p2", "a2"));
        alive.StatusCode.Should().Be(HttpStatusCode.NoContent);
        dead.StatusCode.Should().Be(HttpStatusCode.NoContent);
        _gateway.ResultFor = endpoint => endpoint.EndsWith("/dead", StringComparison.Ordinal)
            ? WebPushSendResult.SubscriptionExpired
            : WebPushSendResult.Sent;

        using var push = await Send(HttpMethod.Post, "/v1/notifications/test", _user, new PushNotificationMessage("Hola", "Mensaje"));

        push.StatusCode.Should().Be(HttpStatusCode.OK);
        _gateway.Endpoints.Should().BeEquivalentTo("https://push.test/alive", "https://push.test/dead");
        (await Subscriptions()).Should().ContainSingle().Which.Endpoint.Should().Be("https://push.test/alive");
    }

    private async Task<HttpResponseMessage> Send(HttpMethod method, string path, Guid user, object? body = null)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("X-User-Id", user.ToString());
        if (body is not null) request.Content = JsonContent.Create(body);
        return await _client.SendAsync(request);
    }

    private async Task<List<WebPushSubscription>> Subscriptions()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NotificationsDbContext>();
        return await db.WebPushSubscriptions.AsNoTracking().ToListAsync();
    }

    private sealed class ConfigurableWebPushGateway : IWebPushGateway
    {
        private readonly List<string> _endpoints = [];
        public IReadOnlyList<string> Endpoints => _endpoints;
        public Func<string, WebPushSendResult> ResultFor { get; set; } = _ => WebPushSendResult.Sent;

        public Task<WebPushSendResult> SendAsync(WebPushSubscription subscription, string title, string body, Dictionary<string, string>? data = null, CancellationToken ct = default)
        {
            _endpoints.Add(subscription.Endpoint);
            return Task.FromResult(ResultFor(subscription.Endpoint));
        }
    }
}
