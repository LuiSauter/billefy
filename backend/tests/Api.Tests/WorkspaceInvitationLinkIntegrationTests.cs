using System.Net;
using System.Net.Http.Json;
using BuildingBlocks.Time;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Workspaces.Contracts;
using Workspaces.Domain.Workspaces;
using Workspaces.Infrastructure;

namespace Api.Tests;

public sealed class WorkspaceInvitationLinkIntegrationTests : IDisposable
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly Guid _owner = Guid.NewGuid();

    public WorkspaceInvitationLinkIntegrationTests()
    {
        _connection.Open();
        _factory = new CustomWebApplicationFactory(configureServices: services =>
        {
            services.AddDbContext<WorkspacesDbContext>(options => options.UseSqlite(_connection));
            services.AddSingleton<IClock>(new FixedClock());
        }, ledgerWorkspacesConnection: _connection);
        _client = _factory.CreateClient();
        using var scope = _factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>().Database.EnsureCreated();
    }

    [Fact]
    public async Task IssueInvitationLink_ReturnsSingleUseSecretAndPersistsOnlyItsHash()
    {
        var workspaceId = await CreateWorkspace();
        using var response = await Send(HttpMethod.Post, $"/v1/workspaces/{workspaceId}/invitation-links", _owner);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.CacheControl?.NoStore.Should().BeTrue();
        response.Headers.Location.Should().BeNull();
        var bodyText = await response.Content.ReadAsStringAsync();
        using var body = System.Text.Json.JsonDocument.Parse(bodyText);
        var token = body.RootElement.GetProperty("token").GetString()!;
        token.Should().MatchRegex("^[A-Za-z0-9_-]{43}$");
        Convert.FromBase64String(token.Replace('-', '+').Replace('_', '/') + "=").Should().HaveCount(32);
        bodyText.Should().NotContain("http://").And.NotContain("https://");
        body.RootElement.GetProperty("expiresAt").GetDateTime().Should().Be(new DateTime(2026, 6, 22, 12, 0, 0, DateTimeKind.Utc));
        var secondToken = await IssueToken(workspaceId);
        secondToken.Should().NotBe(token);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
        var expectedHash = Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
        var link = await db.WorkspaceInvitationLinks.SingleAsync(x => x.TokenHash == expectedHash);
        link.TokenHash.Should().NotContain(token);
        link.WorkspaceId.Should().Be(workspaceId);
        link.IssuerMemberId.Should().NotBeEmpty();
        link.Version.Should().Be(1);
        link.ConsumedAt.Should().BeNull();
        link.RevokedAt.Should().BeNull();
        (await db.WorkspaceInvitationLinks.CountAsync()).Should().Be(2);
        (await db.WorkspaceMembers.CountAsync()).Should().Be(1);
        (await db.WorkspaceInvitations.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task AcceptInvitationLink_CreatesAuthenticatedMember()
    {
        var workspaceId = await CreateWorkspace();
        var token = await IssueToken(workspaceId);
        var accepter = Guid.NewGuid();

        using var response = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/accept", accepter, new { token });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.CacheControl?.NoStore.Should().BeTrue();
        var accepted = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        accepted.GetProperty("workspaceId").GetGuid().Should().Be(workspaceId);
        var membershipId = accepted.GetProperty("membershipId").GetGuid();
        accepted.EnumerateObject().Select(x => x.Name).Order().Should().Equal("membershipId", "workspaceId");
        var responseText = accepted.GetRawText();
        responseText.Should().NotContain(token).And.NotContain("income").And.NotContain("account");

        using var repeated = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/accept", accepter, new { token });
        repeated.StatusCode.Should().Be(HttpStatusCode.OK);
        (await repeated.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("membershipId").GetGuid().Should().Be(membershipId);
        using var replay = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/accept", Guid.NewGuid(), new { token });
        replay.StatusCode.Should().Be(HttpStatusCode.NotFound);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
        var member = await db.WorkspaceMembers.SingleAsync(x => x.Id == membershipId);
        member.UserId.Should().Be(accepter);
        member.WorkspaceRole.Should().Be(WorkspaceRole.Member);
        member.IncomeSharePercentage.Should().Be(0m);
        member.DefaultCustomSharePercentage.Should().Be(0m);
        member.DefaultResponsibilityWeight.Should().Be(1m);
        (await db.WorkspaceMembers.CountAsync(x => x.WorkspaceId == workspaceId)).Should().Be(2);
        var link = await db.WorkspaceInvitationLinks.SingleAsync(x => x.TokenHash == Convert.ToHexStringLower(
            System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token))));
        link.ConsumedByUserId.Should().Be(accepter);
        link.Version.Should().Be(2);
    }

    [Fact]
    public async Task AcceptInvitationLink_PreservesExistingAdministratorAndRejectsInactiveMembership()
    {
        var workspaceId = await CreateWorkspace();
        var administrator = Guid.NewGuid();
        var inactiveUser = Guid.NewGuid();
        var activeMember = new WorkspaceMember(Guid.NewGuid(), workspaceId, administrator, WorkspaceRole.Admin, 37m, FixedClock.Now, 12m, 4m);
        var inactiveMember = new WorkspaceMember(Guid.NewGuid(), workspaceId, inactiveUser, WorkspaceRole.Member, 20m, FixedClock.Now);
        inactiveMember.Deactivate();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
            db.WorkspaceMembers.AddRange(activeMember, inactiveMember);
            await db.SaveChangesAsync();
        }

        var token = await IssueToken(workspaceId);
        using var accepted = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/accept", administrator, new { token });
        accepted.StatusCode.Should().Be(HttpStatusCode.OK);
        (await accepted.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("membershipId").GetGuid().Should().Be(activeMember.Id);
        var inactiveToken = await IssueToken(workspaceId);
        using var rejected = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/accept", inactiveUser, new { token = inactiveToken });
        rejected.StatusCode.Should().Be(HttpStatusCode.NotFound);

        using var verify = _factory.Services.CreateScope();
        var verifyDb = verify.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
        var persisted = await verifyDb.WorkspaceMembers.SingleAsync(x => x.Id == activeMember.Id);
        persisted.WorkspaceRole.Should().Be(WorkspaceRole.Admin);
        persisted.IncomeSharePercentage.Should().Be(37m);
        persisted.DefaultCustomSharePercentage.Should().Be(12m);
        persisted.DefaultResponsibilityWeight.Should().Be(4m);
        (await verifyDb.WorkspaceInvitationLinks.OrderBy(x => x.Version).Select(x => x.Version).ToArrayAsync())
            .Should().Equal(1, 2);
    }

    [Fact]
    public async Task AcceptRequiresCurrentIssuerManagerButRevocationDoesNotRequireOriginalIssuer()
    {
        var workspaceId = await CreateWorkspace();
        var issuerUser = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>().WorkspaceMembers.Add(
                new WorkspaceMember(Guid.NewGuid(), workspaceId, issuerUser, WorkspaceRole.Admin, 0m, FixedClock.Now));
            await scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>().SaveChangesAsync();
        }
        using var firstIssue = await Send(HttpMethod.Post, $"/v1/workspaces/{workspaceId}/invitation-links", issuerUser);
        using var secondIssue = await Send(HttpMethod.Post, $"/v1/workspaces/{workspaceId}/invitation-links", issuerUser);
        var firstToken = (await firstIssue.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("token").GetString()!;
        var second = await secondIssue.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var secondToken = second.GetProperty("token").GetString()!;
        Guid secondLinkId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
            var issuer = await db.WorkspaceMembers.SingleAsync(x => x.UserId == issuerUser);
            issuer.ChangeRole(WorkspaceRole.Member);
            await db.SaveChangesAsync();
            var secondHash = Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(secondToken)));
            secondLinkId = (await db.WorkspaceInvitationLinks.SingleAsync(x => x.TokenHash == secondHash)).Id;
        }

        using var rejected = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/accept", Guid.NewGuid(), new { token = firstToken });
        rejected.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var revokedByCurrentOwner = await Send(HttpMethod.Delete, $"/v1/workspaces/{workspaceId}/invitation-links/{secondLinkId}", _owner);
        revokedByCurrentOwner.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task AcceptInvitationLink_ControlsBodyErrorsAndRequiresAuthenticationBeforeParsing()
    {
        using var unauthenticated = await SendRaw(HttpMethod.Post, "/v1/workspaces/invitation-links/accept", null, "{ malformed");
        unauthenticated.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var malformed = await SendRaw(HttpMethod.Post, "/v1/workspaces/invitation-links/accept", _owner, "{ malformed");
        malformed.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var unsupported = await SendRaw(HttpMethod.Post, "/v1/workspaces/invitation-links/accept", _owner, "{}", "text/plain");
        unsupported.StatusCode.Should().Be(HttpStatusCode.UnsupportedMediaType);
        using var invalid = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/accept", _owner, new { token = "invalid" });
        invalid.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task RevokeInvitationLink_IsIdempotentlyNoContentForManager()
    {
        var workspaceId = await CreateWorkspace();
        var token = await IssueToken(workspaceId);
        Guid linkId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
            linkId = (await db.WorkspaceInvitationLinks.SingleAsync()).Id;
        }

        using var response = await Send(HttpMethod.Delete, $"/v1/workspaces/{workspaceId}/invitation-links/{linkId}", _owner);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var repeated = await Send(HttpMethod.Delete, $"/v1/workspaces/{workspaceId}/invitation-links/{linkId}", _owner);
        repeated.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var verificationScope = _factory.Services.CreateScope();
        var link = await verificationScope.ServiceProvider.GetRequiredService<WorkspacesDbContext>().WorkspaceInvitationLinks.SingleAsync();
        link.RevokedAt.Should().Be(FixedClock.Now);
        link.Version.Should().Be(2);
    }

    [Fact]
    public async Task IssueInvitationLink_RequiresActiveOwnerOrAdministrator()
    {
        var workspaceId = await CreateWorkspace();
        var memberUser = Guid.NewGuid();
        var member = new WorkspaceMember(Guid.NewGuid(), workspaceId, memberUser, WorkspaceRole.Member, 0m, FixedClock.Now);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
            db.WorkspaceMembers.Add(member);
            await db.SaveChangesAsync();
        }
        using var denied = await Send(HttpMethod.Post, $"/v1/workspaces/{workspaceId}/invitation-links", memberUser);
        denied.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        using var outsider = await Send(HttpMethod.Post, $"/v1/workspaces/{workspaceId}/invitation-links", Guid.NewGuid());
        outsider.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
            (await db.WorkspaceMembers.SingleAsync(x => x.Id == member.Id)).Deactivate();
            await db.SaveChangesAsync();
        }
        using var inactiveMember = await Send(HttpMethod.Post, $"/v1/workspaces/{workspaceId}/invitation-links", memberUser);
        inactiveMember.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var inactive = await Send(HttpMethod.Post, $"/v1/workspaces/{Guid.NewGuid()}/invitation-links", _owner);
        inactive.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PreviewInvitationLink_IsAuthenticatedMinimalAndDoesNotRequireMembership()
    {
        var workspaceId = await CreateWorkspace();
        using var issue = await Send(HttpMethod.Post, $"/v1/workspaces/{workspaceId}/invitation-links", _owner);
        var issued = await issue.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var token = issued.GetProperty("token").GetString()!;
        var recipient = Guid.NewGuid();
        using var preview = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/preview", recipient, new { token });
        preview.StatusCode.Should().Be(HttpStatusCode.OK);
        preview.Headers.CacheControl?.NoStore.Should().BeTrue();
        using var result = await preview.Content.ReadFromJsonAsync<System.Text.Json.JsonDocument>() ?? throw new InvalidOperationException();
        var properties = result.RootElement.EnumerateObject().Select(x => x.Name).Order().ToArray();
        properties.Should().Equal("alreadyMember", "expiresAt", "workspaceId", "workspaceName", "workspaceRole");
        result.RootElement.GetProperty("workspaceId").GetGuid().Should().Be(workspaceId);
        result.RootElement.GetProperty("workspaceName").GetString().Should().Be("Private name");
        result.RootElement.GetProperty("workspaceRole").GetString().Should().Be("Member");
        result.RootElement.GetProperty("alreadyMember").GetBoolean().Should().BeFalse();
        var serialized = result.RootElement.GetRawText();
        serialized.Should().NotContain(token).And.NotContain("account").And.NotContain("memberId").And.NotContain("income");
        using var existingMemberPreview = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/preview", _owner, new { token });
        existingMemberPreview.StatusCode.Should().Be(HttpStatusCode.OK);
        (await existingMemberPreview.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("alreadyMember").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Administrator_CanIssueLinkWithFixedMemberRole()
    {
        var workspaceId = await CreateWorkspace();
        var adminUser = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
            db.WorkspaceMembers.Add(new WorkspaceMember(Guid.NewGuid(), workspaceId, adminUser, WorkspaceRole.Admin, 0m, FixedClock.Now));
            await db.SaveChangesAsync();
        }
        using var response = await Send(HttpMethod.Post, $"/v1/workspaces/{workspaceId}/invitation-links", adminUser);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task PreviewInvitationLink_RejectsInvalidStatesGenericallyAndControlsTransportErrors()
    {
        using var unauthenticated = await SendRaw(HttpMethod.Post, "/v1/workspaces/invitation-links/preview", null, "{ malformed");
        unauthenticated.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        unauthenticated.Headers.CacheControl?.NoStore.Should().BeTrue();

        using var malformed = await SendRaw(HttpMethod.Post, "/v1/workspaces/invitation-links/preview", _owner, "{ malformed");
        malformed.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var unsupported = await SendRaw(HttpMethod.Post, "/v1/workspaces/invitation-links/preview", _owner, "{}", "text/plain");
        unsupported.StatusCode.Should().Be(HttpStatusCode.UnsupportedMediaType);
        using var unknown = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/preview", _owner, new { token = "not-a-token" });
        unknown.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var unknownBody = await unknown.Content.ReadAsStringAsync();
        unknownBody.Should().NotContain("not-a-token").And.NotContain("expired").And.NotContain("revoked");
        using var invalidEncoding = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/preview", _owner,
            new { token = new string('é', 43) });
        invalidEncoding.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PreviewInvitationLink_HidesExpiredRevokedConsumedAndIssuerInvalidLinks()
    {
        var workspaceId = await CreateWorkspace();
        var token = await IssueToken(workspaceId);
        using var valid = await Preview(token);
        valid.StatusCode.Should().Be(HttpStatusCode.OK);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
            var link = await db.WorkspaceInvitationLinks.SingleAsync();
            link.Revoke(FixedClock.Now);
            await db.SaveChangesAsync();
        }
        using var revoked = await Preview(token);
        revoked.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var expiredToken = NewToken();
        var consumedToken = NewToken();
        var demotedToken = NewToken();
        var removedToken = NewToken();
        var adminUser = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
            var owner = await db.WorkspaceMembers.SingleAsync(x => x.WorkspaceId == workspaceId && x.UserId == _owner);
            var admin = new WorkspaceMember(Guid.NewGuid(), workspaceId, adminUser, WorkspaceRole.Admin, 0m, FixedClock.Now);
            var removedAdmin = new WorkspaceMember(Guid.NewGuid(), workspaceId, Guid.NewGuid(), WorkspaceRole.Admin, 0m, FixedClock.Now);
            db.WorkspaceMembers.AddRange(admin, removedAdmin);
            var expired = Link(workspaceId, owner.Id, expiredToken, FixedClock.Now.AddDays(-8), FixedClock.Now.AddDays(-1));
            var consumed = Link(workspaceId, owner.Id, consumedToken, FixedClock.Now.AddDays(-1), FixedClock.Now.AddDays(6));
            consumed.Consume(Guid.NewGuid(), FixedClock.Now.AddMinutes(-1));
            var demoted = Link(workspaceId, admin.Id, demotedToken, FixedClock.Now, FixedClock.Now.AddDays(7));
            var removed = Link(workspaceId, removedAdmin.Id, removedToken, FixedClock.Now, FixedClock.Now.AddDays(7));
            db.WorkspaceInvitationLinks.AddRange(expired, consumed, demoted, removed);
            await db.SaveChangesAsync();
            admin.ChangeRole(WorkspaceRole.Member);
            removedAdmin.Deactivate();
            await db.SaveChangesAsync();
        }
        foreach (var unavailable in new[] { expiredToken, consumedToken, demotedToken, removedToken })
        {
            using var response = await Preview(unavailable);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        var inactiveWorkspaceId = await CreateWorkspace();
        var inactiveWorkspaceToken = await IssueToken(inactiveWorkspaceId);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>();
            var workspace = await db.Workspaces.SingleAsync(x => x.Id == inactiveWorkspaceId);
            workspace.Deactivate();
            await db.SaveChangesAsync();
        }
        using var inactiveWorkspace = await Preview(inactiveWorkspaceToken);
        inactiveWorkspace.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task InvitationLinkRateLimit_IsPartitionedByEstablishedAuthenticatedUser()
    {
        var firstUser = Guid.NewGuid();
        for (var attempt = 0; attempt < 30; attempt++)
        {
            using var response = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/preview", firstUser, new { token = "invalid" });
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
        using var limited = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/preview", firstUser, new { token = "invalid" });
        limited.StatusCode.Should().Be((HttpStatusCode)429);
        using var independent = await Send(HttpMethod.Post, "/v1/workspaces/invitation-links/preview", Guid.NewGuid(), new { token = "invalid" });
        independent.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PreviewInvitationLink_OpenApiDescribesTypedBodyAndMinimalResponse()
    {
        using var response = await _client.GetAsync("/openapi/v1.json");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var document = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var operation = document.RootElement.GetProperty("paths").GetProperty("/v1/workspaces/invitation-links/preview").GetProperty("post");
        operation.GetProperty("requestBody").GetProperty("content").GetProperty("application/json")
            .GetProperty("schema").GetProperty("$ref").GetString().Should().Be("#/components/schemas/PreviewWorkspaceInvitationLinkRequest");
        operation.GetProperty("responses").GetProperty("200").GetProperty("content").GetProperty("application/json")
            .GetProperty("schema").GetProperty("$ref").GetString().Should().Be("#/components/schemas/WorkspaceInvitationLinkPreviewDto");
        operation.GetProperty("responses").TryGetProperty("400", out _).Should().BeTrue();
        operation.GetProperty("responses").TryGetProperty("415", out _).Should().BeTrue();
        var accept = document.RootElement.GetProperty("paths").GetProperty("/v1/workspaces/invitation-links/accept").GetProperty("post");
        accept.GetProperty("requestBody").GetProperty("content").GetProperty("application/json")
            .GetProperty("schema").GetProperty("$ref").GetString().Should().Be("#/components/schemas/AcceptWorkspaceInvitationLinkRequest");
        accept.GetProperty("responses").GetProperty("200").GetProperty("content").GetProperty("application/json")
            .GetProperty("schema").GetProperty("$ref").GetString().Should().Be("#/components/schemas/AcceptWorkspaceInvitationLinkResponse");
        accept.GetProperty("responses").TryGetProperty("415", out _).Should().BeTrue();
        var revoke = document.RootElement.GetProperty("paths")
            .GetProperty("/v1/workspaces/{workspaceId}/invitation-links/{linkId}").GetProperty("delete");
        revoke.GetProperty("responses").TryGetProperty("204", out _).Should().BeTrue();
    }

    private static string NewToken() => Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
        .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static WorkspaceInvitationLink Link(Guid workspaceId, Guid issuerMemberId, string token, DateTime createdAt, DateTime expiresAt) =>
        new(Guid.NewGuid(), workspaceId, issuerMemberId,
            Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token))), createdAt, expiresAt);

    private async Task<Guid> CreateWorkspace()
    {
        using var create = await Send(HttpMethod.Post, "/v1/workspaces", _owner,
            new { name = "Private name", workspaceType = "Roommates", baseCurrency = "USD" });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await create.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("id").GetGuid();
    }

    private async Task<string> IssueToken(Guid workspaceId)
    {
        using var issue = await Send(HttpMethod.Post, $"/v1/workspaces/{workspaceId}/invitation-links", _owner);
        issue.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await issue.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("token").GetString()!;
    }

    private Task<HttpResponseMessage> Preview(string token) =>
        Send(HttpMethod.Post, "/v1/workspaces/invitation-links/preview", Guid.NewGuid(), new { token });

    private async Task<HttpResponseMessage> SendRaw(HttpMethod method, string path, Guid? user, string body, string contentType = "application/json")
    {
        using var request = new HttpRequestMessage(method, path);
        if (user.HasValue) request.Headers.Add("X-User-Id", user.Value.ToString());
        request.Content = new StringContent(body, System.Text.Encoding.UTF8, contentType);
        return await _client.SendAsync(request);
    }

    private async Task<HttpResponseMessage> Send(HttpMethod method, string path, Guid? user, object? body = null)
    {
        using var request = new HttpRequestMessage(method, path);
        if (user.HasValue) request.Headers.Add("X-User-Id", user.Value.ToString());
        if (body is not null) request.Content = JsonContent.Create(body);
        return await _client.SendAsync(request);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        _connection.Dispose();
    }

    private sealed class FixedClock : IClock
    {
        public static DateTime Now => new(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc);
        public DateTime UtcNow => Now;
        public DateOnly TodayUtc => DateOnly.FromDateTime(UtcNow);
    }
}
