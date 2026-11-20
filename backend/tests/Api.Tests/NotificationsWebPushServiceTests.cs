using BuildingBlocks.Time;
using FluentAssertions;
using Notifications.Application.Abstractions;
using Notifications.Application.Services;
using Notifications.Contracts;
using Notifications.Domain.Entities;

namespace Api.Tests;

public sealed class NotificationsWebPushServiceTests
{
    private static readonly Guid UserA = Guid.NewGuid();
    private static readonly Guid UserB = Guid.NewGuid();

    private readonly FakeNotificationsStore _store = new();
    private readonly FakeWebPushGateway _gateway = new();
    private readonly NotificationsService _service;

    public NotificationsWebPushServiceTests()
    {
        _service = new NotificationsService(
            _store,
            _store,
            _store,
            new AcceptingPushGateway(),
            _gateway,
            new AcceptingEmailGateway(),
            _store,
            new FixedClock());
    }

    [Fact]
    public async Task SubscribeWebPush_NewEndpoint_PersistsSubscriptionForUser()
    {
        var result = await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/a", "p256dh-a", "auth-a"));

        result.IsSuccess.Should().BeTrue();
        var stored = _store.Subscriptions.Should().ContainSingle().Subject;
        stored.UserId.Should().Be(UserA);
        stored.Endpoint.Should().Be("https://push.test/a");
        stored.P256dhKey.Should().Be("p256dh-a");
        stored.AuthKey.Should().Be("auth-a");
        _store.CommitCount.Should().Be(1);
    }

    [Fact]
    public async Task SubscribeWebPush_SameEndpointSameUser_IsIdempotentAndDoesNotDuplicate()
    {
        await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/a", "p256dh-a", "auth-a"));
        var original = _store.Subscriptions.Single();

        var result = await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/a", "p256dh-a", "auth-a"));

        result.IsSuccess.Should().BeTrue();
        _store.Subscriptions.Should().ContainSingle().Which.Id.Should().Be(original.Id);
    }

    [Fact]
    public async Task SubscribeWebPush_EndpointOwnedByAnotherUser_ReassignsToCurrentUserWithoutConflict()
    {
        await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/shared", "p256dh-old", "auth-old"));

        var result = await _service.SubscribeWebPushAsync(UserB, new SubscribeWebPushRequest("https://push.test/shared", "p256dh-new", "auth-new"));

        result.IsSuccess.Should().BeTrue();
        var stored = _store.Subscriptions.Should().ContainSingle().Subject;
        stored.UserId.Should().Be(UserB);
        stored.Endpoint.Should().Be("https://push.test/shared");
        stored.P256dhKey.Should().Be("p256dh-new");
        stored.AuthKey.Should().Be("auth-new");
        (await _store.GetByUserIdAsync(UserA)).Should().BeEmpty();
    }

    [Theory]
    [InlineData("", "p", "a")]
    [InlineData("https://push.test/a", "", "a")]
    [InlineData("https://push.test/a", "p", " ")]
    public async Task SubscribeWebPush_InvalidRequest_FailsAndStoresNothing(string endpoint, string p256dh, string auth)
    {
        var result = await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest(endpoint, p256dh, auth));

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(BuildingBlocks.Common.ErrorType.Validation);
        _store.Subscriptions.Should().BeEmpty();
        _store.CommitCount.Should().Be(0);
    }

    [Fact]
    public async Task UnsubscribeWebPush_OwnEndpoint_RemovesSubscription()
    {
        await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/a", "p", "a"));

        var result = await _service.UnsubscribeWebPushAsync(UserA, "https://push.test/a");

        result.IsSuccess.Should().BeTrue();
        _store.Subscriptions.Should().BeEmpty();
    }

    [Fact]
    public async Task UnsubscribeWebPush_UnknownEndpoint_IsNoOpSuccess()
    {
        var result = await _service.UnsubscribeWebPushAsync(UserA, "https://push.test/missing");

        result.IsSuccess.Should().BeTrue();
        _store.Subscriptions.Should().BeEmpty();
    }

    [Fact]
    public async Task UnsubscribeWebPush_EndpointOwnedByAnotherUser_IsNoOpSuccessAndLeavesSubscription()
    {
        await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/a", "p", "a"));

        var result = await _service.UnsubscribeWebPushAsync(UserB, "https://push.test/a");

        result.IsSuccess.Should().BeTrue();
        _store.Subscriptions.Should().ContainSingle().Which.UserId.Should().Be(UserA);
    }

    [Fact]
    public async Task SendPush_FansOutToEveryWebPushSubscriptionAndLogsDelivery()
    {
        await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/1", "p1", "a1"));
        await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/2", "p2", "a2"));
        await _service.SubscribeWebPushAsync(UserB, new SubscribeWebPushRequest("https://push.test/other", "p3", "a3"));

        var result = await _service.SendPushNotificationAsync(UserA, new PushNotificationMessage("Hola", "Mensaje"));

        result.IsSuccess.Should().BeTrue();
        _gateway.Sent.Select(x => x.Endpoint).Should().BeEquivalentTo("https://push.test/1", "https://push.test/2");
        _gateway.Sent.Should().OnlyContain(x => x.Title == "Hola" && x.Body == "Mensaje");
        var logs = _store.Logs.Where(l => l.UserId == UserA && l.Channel == "WebPush").ToList();
        logs.Should().HaveCount(2);
        logs.Should().OnlyContain(l => l.Type == NotificationType.Push && l.Status == "Delivered");
        _store.Logs.Should().NotContain(l => l.Type == NotificationType.InApp);
    }

    [Fact]
    public async Task SendPush_GatewayFailure_LogsFailureAndKeepsSubscription()
    {
        await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/1", "p1", "a1"));
        _gateway.ResultFor = _ => WebPushSendResult.Failed;

        var result = await _service.SendPushNotificationAsync(UserA, new PushNotificationMessage("Hola", "Mensaje"));

        result.IsSuccess.Should().BeTrue();
        _store.Logs.Should().ContainSingle(l => l.Channel == "WebPush").Which.Status.Should().Be("Failed");
        _store.Subscriptions.Should().ContainSingle();
    }

    [Fact]
    public async Task SendPush_ExpiredSubscription_IsRemovedWhileHealthyOnesAreKept()
    {
        await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/dead", "p1", "a1"));
        await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/alive", "p2", "a2"));
        _gateway.ResultFor = endpoint => endpoint.EndsWith("/dead", StringComparison.Ordinal)
            ? WebPushSendResult.SubscriptionExpired
            : WebPushSendResult.Sent;
        var commitsBefore = _store.CommitCount;

        var result = await _service.SendPushNotificationAsync(UserA, new PushNotificationMessage("Hola", "Mensaje"));

        result.IsSuccess.Should().BeTrue();
        _store.Subscriptions.Should().ContainSingle().Which.Endpoint.Should().Be("https://push.test/alive");
        _store.Logs.Single(l => l.Channel == "WebPush" && l.Status == "Failed").Should().NotBeNull();
        _store.Logs.Single(l => l.Channel == "WebPush" && l.Status == "Delivered").Should().NotBeNull();
        _store.CommitCount.Should().Be(commitsBefore + 1, "removal and logs share one unit of work");
    }

    [Fact]
    public async Task SendPush_DevicesAndWebPush_FansOutToBothChannels()
    {
        await _service.RegisterDeviceAsync(UserA, new RegisterDeviceTokenRequest("fcm-token", "Android"));
        await _service.SubscribeWebPushAsync(UserA, new SubscribeWebPushRequest("https://push.test/1", "p1", "a1"));

        var result = await _service.SendPushNotificationAsync(UserA, new PushNotificationMessage("Hola", "Mensaje"));

        result.IsSuccess.Should().BeTrue();
        _store.Logs.Should().Contain(l => l.Channel == "Android" && l.Status == "Delivered");
        _store.Logs.Should().Contain(l => l.Channel == "WebPush" && l.Status == "Delivered");
        _store.Logs.Should().NotContain(l => l.Type == NotificationType.InApp);
    }

    [Fact]
    public async Task SendPush_NoDevicesAndNoWebPush_KeepsInAppFallbackLog()
    {
        var result = await _service.SendPushNotificationAsync(UserA, new PushNotificationMessage("Hola", "Mensaje"));

        result.IsSuccess.Should().BeTrue();
        _gateway.Sent.Should().BeEmpty();
        _store.Logs.Should().ContainSingle().Which.Should().Match<NotificationLog>(l =>
            l.Type == NotificationType.InApp && l.Channel == "InApp" && l.Status == "Delivered");
    }

    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly TodayUtc => DateOnly.FromDateTime(UtcNow);
    }

    private sealed class AcceptingPushGateway : IPushGateway
    {
        public Task<bool> SendPushAsync(string token, string title, string body, Dictionary<string, string>? data = null, CancellationToken ct = default) =>
            Task.FromResult(true);
    }

    private sealed class AcceptingEmailGateway : IEmailGateway
    {
        public Task<bool> SendEmailAsync(string toEmail, string subject, string body, CancellationToken ct = default) =>
            Task.FromResult(true);
    }

    private sealed class FakeWebPushGateway : IWebPushGateway
    {
        public List<(string Endpoint, string Title, string Body)> Sent { get; } = [];
        public Func<string, WebPushSendResult> ResultFor { get; set; } = _ => WebPushSendResult.Sent;

        public Task<WebPushSendResult> SendAsync(WebPushSubscription subscription, string title, string body, Dictionary<string, string>? data = null, CancellationToken ct = default)
        {
            Sent.Add((subscription.Endpoint, title, body));
            return Task.FromResult(ResultFor(subscription.Endpoint));
        }
    }

    /// <summary>
    /// In-memory stand-in for the Notifications persistence ports. Removals and additions are staged and
    /// only applied on <see cref="CommitAsync"/>, so tests can assert behavior happens in one unit of work.
    /// </summary>
    private sealed class FakeNotificationsStore : IDeviceTokenRepository, IWebPushSubscriptionRepository, INotificationLogRepository, INotificationsUnitOfWork
    {
        private readonly List<DeviceToken> _devices = [];
        private readonly List<WebPushSubscription> _subscriptions = [];
        private readonly List<NotificationLog> _logs = [];
        private readonly List<DeviceToken> _pendingDevices = [];
        private readonly List<WebPushSubscription> _pendingSubscriptionAdds = [];
        private readonly List<WebPushSubscription> _pendingSubscriptionRemovals = [];
        private readonly List<NotificationLog> _pendingLogs = [];

        public IReadOnlyList<WebPushSubscription> Subscriptions => _subscriptions;
        public IReadOnlyList<NotificationLog> Logs => _logs;
        public int CommitCount { get; private set; }

        public Task<int> CommitAsync(CancellationToken ct = default)
        {
            _subscriptions.RemoveAll(s => _pendingSubscriptionRemovals.Contains(s));
            _subscriptions.AddRange(_pendingSubscriptionAdds);
            _devices.AddRange(_pendingDevices);
            _logs.AddRange(_pendingLogs);
            var changes = _pendingSubscriptionRemovals.Count + _pendingSubscriptionAdds.Count + _pendingDevices.Count + _pendingLogs.Count;
            _pendingSubscriptionRemovals.Clear();
            _pendingSubscriptionAdds.Clear();
            _pendingDevices.Clear();
            _pendingLogs.Clear();
            CommitCount++;
            return Task.FromResult(changes);
        }

        Task<IReadOnlyList<DeviceToken>> IDeviceTokenRepository.GetActiveByUserIdAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<DeviceToken>>(_devices.Where(d => d.UserId == userId && d.IsActive).ToList());

        public Task<DeviceToken?> GetByTokenAsync(string token, CancellationToken ct = default) =>
            Task.FromResult(_devices.FirstOrDefault(d => d.Token == token));

        public Task AddAsync(DeviceToken token, CancellationToken ct = default)
        {
            _pendingDevices.Add(token);
            return Task.CompletedTask;
        }

        public void Update(DeviceToken token)
        {
        }

        public Task<IReadOnlyList<WebPushSubscription>> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<WebPushSubscription>>(_subscriptions.Where(s => s.UserId == userId).ToList());

        public Task<WebPushSubscription?> GetByEndpointAsync(string endpoint, CancellationToken ct = default) =>
            Task.FromResult(_subscriptions.FirstOrDefault(s => s.Endpoint == endpoint));

        public Task AddAsync(WebPushSubscription subscription, CancellationToken ct = default)
        {
            _pendingSubscriptionAdds.Add(subscription);
            return Task.CompletedTask;
        }

        public void Remove(WebPushSubscription subscription) => _pendingSubscriptionRemovals.Add(subscription);

        Task<IReadOnlyList<NotificationLog>> INotificationLogRepository.GetByUserIdAsync(Guid userId, int limit, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<NotificationLog>>(_logs.Where(l => l.UserId == userId).Take(limit).ToList());

        public Task AddAsync(NotificationLog log, CancellationToken ct = default)
        {
            _pendingLogs.Add(log);
            return Task.CompletedTask;
        }
    }
}
