using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Workspaces.Contracts;
using Workspaces.Domain.Workspaces;
using Workspaces.Infrastructure;

namespace Api.Tests;

public sealed class WorkspaceInvitationLinkConcurrencyTests : IDisposable
{
    private readonly SqliteConnection _keeper;
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly TransientConcurrencyInterceptor _concurrencyInterceptor = new();
    private readonly Guid _owner = Guid.NewGuid();

    public WorkspaceInvitationLinkConcurrencyTests()
    {
        var connectionString = $"Data Source=invitation-links-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5";
        _keeper = new SqliteConnection(connectionString);
        _keeper.Open();
        _factory = new CustomWebApplicationFactory(configureServices: services =>
        {
            services.AddSingleton(_concurrencyInterceptor);
            services.AddDbContext<WorkspacesDbContext>(options =>
                options.UseSqlite(connectionString).AddInterceptors(_concurrencyInterceptor));
        });
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task DifferentUsersRacingForOneLink_HaveExactlyOneWinner()
    {
        var (workspaceId, token) = await CreateLink();
        var users = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var responses = await Task.WhenAll(users.Select(user => Accept(token, user)));
        responses.Select(x => x.StatusCode).Order().Should().Equal(HttpStatusCode.OK, HttpStatusCode.NotFound);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
        (await db.WorkspaceMembers.CountAsync(x => x.WorkspaceId == workspaceId)).Should().Be(2);
        var acceptedBy = (await db.WorkspaceInvitationLinks.SingleAsync()).ConsumedByUserId;
        users.Should().Contain(acceptedBy!.Value);
    }

    [Fact]
    public async Task SameUserRacingWithSelf_ReturnsSameMembershipWithoutDuplicate()
    {
        var (workspaceId, token) = await CreateLink();
        var accepter = Guid.NewGuid();
        var responses = await Task.WhenAll(Accept(token, accepter), Accept(token, accepter));
        responses.Should().OnlyContain(x => x.StatusCode == HttpStatusCode.OK);
        var membershipIds = new List<Guid>();
        foreach (var response in responses)
        {
            using (response)
                membershipIds.Add((await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>())
                    .GetProperty("membershipId").GetGuid());
        }
        membershipIds.Distinct().Should().ContainSingle();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
        (await db.WorkspaceMembers.CountAsync(x => x.WorkspaceId == workspaceId)).Should().Be(2);
        (await db.WorkspaceInvitationLinks.SingleAsync()).Version.Should().Be(2);
    }

    [Fact]
    public async Task RetriableOptimisticFailure_UsesFreshContextAndCommitsOnlyOnce()
    {
        var (workspaceId, token) = await CreateLink();
        _concurrencyInterceptor.Arm(1);
        using var response = await Accept(token, Guid.NewGuid());
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
        (await db.WorkspaceMembers.CountAsync(x => x.WorkspaceId == workspaceId)).Should().Be(2);
        (await db.WorkspaceInvitationLinks.SingleAsync()).Version.Should().Be(2);
    }

    [Fact]
    public async Task CancellationDuringRetryDelay_LeavesLinkAndMembershipUnchanged()
    {
        var (workspaceId, token) = await CreateLink();
        using var cancellation = new CancellationTokenSource();
        _concurrencyInterceptor.Arm(1, cancellation.Cancel);
        var accepting = () => Accept(token, Guid.NewGuid(), cancellation.Token);
        await accepting.Should().ThrowAsync<OperationCanceledException>();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
        (await db.WorkspaceMembers.CountAsync(x => x.WorkspaceId == workspaceId)).Should().Be(1);
        var link = await db.WorkspaceInvitationLinks.SingleAsync();
        link.Version.Should().Be(1);
        link.ConsumedAt.Should().BeNull();
    }

    [Fact]
    public async Task ExhaustedOptimisticFailures_RollBackMemberAndConsumedLink()
    {
        var (workspaceId, token) = await CreateLink();
        _concurrencyInterceptor.Arm(5);
        using var response = await Accept(token, Guid.NewGuid());
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
        (await db.WorkspaceMembers.CountAsync(x => x.WorkspaceId == workspaceId)).Should().Be(1);
        var link = await db.WorkspaceInvitationLinks.SingleAsync();
        link.Version.Should().Be(1);
        link.ConsumedAt.Should().BeNull();
    }

    [Fact]
    public async Task AcceptRacingWithRevoke_LeavesOneConsistentOutcome()
    {
        var (workspaceId, token) = await CreateLink();
        Guid linkId;
        using (var scope = _factory.Services.CreateScope())
        {
            linkId = await scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>()
                .WorkspaceInvitationLinks.Select(x => x.Id).SingleAsync();
        }

        var acceptTask = Accept(token, Guid.NewGuid());
        var revokeTask = Send(HttpMethod.Delete,
            $"/v1/workspaces/{workspaceId}/invitation-links/{linkId}", _owner);
        using var accept = await acceptTask;
        using var revoke = await revokeTask;
        accept.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        revoke.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scopeAfter = _factory.Services.CreateScope();
        var dbAfter = scopeAfter.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
        var link = await dbAfter.WorkspaceInvitationLinks.SingleAsync();
        if (accept.StatusCode == HttpStatusCode.OK)
        {
            link.ConsumedAt.Should().NotBeNull();
            link.RevokedAt.Should().BeNull();
            (await dbAfter.WorkspaceMembers.CountAsync(x => x.WorkspaceId == workspaceId)).Should().Be(2);
        }
        else
        {
            link.RevokedAt.Should().NotBeNull();
            link.ConsumedAt.Should().BeNull();
            (await dbAfter.WorkspaceMembers.CountAsync(x => x.WorkspaceId == workspaceId)).Should().Be(1);
        }
    }

    private async Task<(Guid WorkspaceId, string Token)> CreateLink()
    {
        using var create = await Send(HttpMethod.Post, "/v1/workspaces", _owner,
            new { name = "Concurrent", workspaceType = "Roommates", baseCurrency = "USD" });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var workspaceId = (await create.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("id").GetGuid();
        using var issue = await Send(HttpMethod.Post, $"/v1/workspaces/{workspaceId}/invitation-links", _owner);
        issue.StatusCode.Should().Be(HttpStatusCode.Created);
        var token = (await issue.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("token").GetString()!;
        return (workspaceId, token);
    }

    private Task<HttpResponseMessage> Accept(string token, Guid user, CancellationToken ct = default) =>
        Send(HttpMethod.Post, "/v1/workspaces/invitation-links/accept", user, new { token }, ct);

    private async Task<HttpResponseMessage> Send(HttpMethod method, string path, Guid user, object? body = null,
        CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("X-User-Id", user.ToString());
        if (body is not null)
            request.Content = JsonContent.Create(body);
        return await _client.SendAsync(request, ct);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        _keeper.Dispose();
    }

    private sealed class TransientConcurrencyInterceptor : SaveChangesInterceptor
    {
        private int _failuresRemaining;
        private Action? _onFailure;

        public void Arm(int failures, Action? onFailure = null)
        {
            _onFailure = onFailure;
            Interlocked.Exchange(ref _failuresRemaining, failures);
        }

        public override InterceptionResult<int> SavingChanges(
            DbContextEventData eventData, InterceptionResult<int> result)
        {
            ThrowIfArmed();
            return result;
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            ThrowIfArmed();
            return ValueTask.FromResult(result);
        }

        private void ThrowIfArmed()
        {
            while (true)
            {
                var remaining = Volatile.Read(ref _failuresRemaining);
                if (remaining <= 0)
                    return;
                if (Interlocked.CompareExchange(ref _failuresRemaining, remaining - 1, remaining) == remaining)
                {
                    _onFailure?.Invoke();
                    throw new DbUpdateConcurrencyException("Test-simulated optimistic concurrency failure.");
                }
            }
        }
    }
}
