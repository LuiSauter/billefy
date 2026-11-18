using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using BuildingBlocks.Common;
using Identity.Contracts;
using BuildingBlocks.Time;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Workspaces.Infrastructure;

namespace Api.Tests;

public sealed class WorkspacesIntegrationTests : IDisposable
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly Guid _owner = Guid.NewGuid();
    private readonly TestClock _clock = new();
    private readonly FailWorkspaceSave _saveFailure = new();
    private readonly FailLedgerCommit _ledgerCommitFailure = new();

    public WorkspacesIntegrationTests()
    {
        _connection.Open();
        _factory = new CustomWebApplicationFactory(configureServices: services =>
        {
            services.AddDbContext<WorkspacesDbContext>(options => options.UseSqlite(_connection).AddInterceptors(_saveFailure));
            services.AddDbContext<Ledger.Infrastructure.LedgerDbContext>(options => options.UseSqlite(_connection).AddInterceptors(_ledgerCommitFailure));
            services.AddSingleton<IIdentityModule, WorkspaceTestIdentity>();
            services.AddSingleton<IClock>(_clock);
        }, ledgerWorkspacesConnection: _connection);
        _client = _factory.CreateClient();
        using var scope = _factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<WorkspacesDbContext>().Database.EnsureCreated();
    }

    [Fact]
    public void PostgresConnectionIdentity_AllowsPasswordRedactionButRejectsDifferentEndpointsAndPrincipals()
    {
        var configured = new NpgsqlConnectionStringBuilder
        {
            Host = "db.test.invalid",
            Port = 5432,
            Database = "billefy_test",
            Username = "workspace_app",
            Password = "test-only-placeholder",
            SslMode = SslMode.Require,
            ApplicationName = "billefy-api",
            SearchPath = "public"
        };
        var opened = new NpgsqlConnectionStringBuilder(configured.ConnectionString);
        opened.Remove("Password"); // Npgsql's post-open ConnectionString omits credentials by default.

        PostgresConnectionIdentity.Matches(configured.ConnectionString, opened.ConnectionString).Should().BeTrue();

        var otherDatabase = new NpgsqlConnectionStringBuilder(configured.ConnectionString) { Database = "other_test" };
        PostgresConnectionIdentity.Matches(otherDatabase.ConnectionString, opened.ConnectionString).Should().BeFalse();
        var otherHost = new NpgsqlConnectionStringBuilder(configured.ConnectionString) { Host = "other.test.invalid" };
        PostgresConnectionIdentity.Matches(otherHost.ConnectionString, opened.ConnectionString).Should().BeFalse();
        var otherPrincipal = new NpgsqlConnectionStringBuilder(configured.ConnectionString) { Username = "other_app" };
        PostgresConnectionIdentity.Matches(otherPrincipal.ConnectionString, opened.ConnectionString).Should().BeFalse();
        var otherSecurity = new NpgsqlConnectionStringBuilder(configured.ConnectionString) { SslMode = SslMode.Disable };
        PostgresConnectionIdentity.Matches(otherSecurity.ConnectionString, opened.ConnectionString).Should().BeFalse();
        var otherSession = new NpgsqlConnectionStringBuilder(configured.ConnectionString) { ApplicationName = "different-session" };
        PostgresConnectionIdentity.Matches(otherSession.ConnectionString, opened.ConnectionString).Should().BeFalse();
    }

    [Fact]
    public async Task WorkspaceStartDate_IsDateOnlyOptionalAndPreservedByReplacementUpdates()
    {
        _clock.UtcNow = new DateTime(2026, 6, 15, 23, 30, 0, DateTimeKind.Utc);
        using var create = await Send(HttpMethod.Post, "/v1/workspaces", _owner,
            new { name = "Planned", workspaceType = "Trip", baseCurrency = "USD", startDate = "2028-02-29" });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = (await Json(create)).GetProperty("id").GetGuid();
        using var details = await Send(HttpMethod.Get, $"/v1/workspaces/{id}", _owner);
        var detailsJson = await Json(details);
        detailsJson.GetProperty("startDate").GetString().Should().Be("2028-02-29");
        var createdAt = detailsJson.GetProperty("createdAt").GetDateTime();
        createdAt.Should().Be(_clock.UtcNow);

        using var rename = await Send(HttpMethod.Put, $"/v1/workspaces/{id}", _owner,
            new { name = "Renamed" });
        rename.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var renamed = await Send(HttpMethod.Get, $"/v1/workspaces/{id}", _owner);
        (await Json(renamed)).GetProperty("startDate").GetString().Should().Be("2028-02-29");

        using var settings = await Send(HttpMethod.Put, $"/v1/workspaces/{id}/settings", _owner,
            new { weeklySummary = false });
        settings.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var updated = await Send(HttpMethod.Get, $"/v1/workspaces/{id}", _owner);
        (await Json(updated)).GetProperty("startDate").GetString().Should().Be("2028-02-29");
    }

    [Fact]
    public async Task WorkspaceStartDate_OmittedDefaultsToCreationUtcDateAndInvalidCalendarDateIsRejected()
    {
        _clock.UtcNow = new DateTime(2026, 6, 15, 23, 30, 0, DateTimeKind.Utc);
        var (id, _) = await CreateWorkspace();
        using var details = await Send(HttpMethod.Get, $"/v1/workspaces/{id}", _owner);
        (await Json(details)).GetProperty("startDate").GetString().Should().Be("2026-06-15");
        using var invalid = await Send(HttpMethod.Post, "/v1/workspaces", _owner,
            new { name = "Invalid", workspaceType = "Trip", baseCurrency = "USD", startDate = "2026-02-30" });
        ((int)invalid.StatusCode).Should().BeInRange(400, 499, await invalid.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task WorkspaceCreate_OpenApiKeepsTypedDateOnlyRequestAndCreatedResponse()
    {
        using var response = await _client.GetAsync("/openapi/v1.json");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var specification = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var operation = specification.RootElement.GetProperty("paths").GetProperty("/v1/workspaces").GetProperty("post");
        operation.GetProperty("requestBody").GetProperty("content").GetProperty("application/json")
            .GetProperty("schema").GetProperty("$ref").GetString().Should().Be("#/components/schemas/CreateWorkspaceRequest");
        var schemas = specification.RootElement.GetProperty("components").GetProperty("schemas");
        var requestSchema = schemas.GetProperty("CreateWorkspaceRequest").GetProperty("properties");
        requestSchema.GetProperty("startDate").GetProperty("format").GetString().Should().Be("date");
        requestSchema.GetProperty("workspaceType").GetProperty("$ref").GetString().Should().Be("#/components/schemas/WorkspaceType");
        var responses = operation.GetProperty("responses");
        foreach (var status in new[] { "201", "400", "413", "415" }) responses.TryGetProperty(status, out _).Should().BeTrue();
        responses.GetProperty("201").GetProperty("content").GetProperty("application/json")
            .GetProperty("schema").GetProperty("$ref").GetString().Should().Be("#/components/schemas/CreateWorkspaceResponse");
    }

    [Fact]
    public async Task WorkspaceCreate_InvalidJsonAndNonJsonBodiesReturnSafeClientErrorsAfterAuthorization()
    {
        async Task<HttpResponseMessage> PostRaw(string? body, string contentType = "application/json", Guid? user = null)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/workspaces");
            if (user.HasValue) request.Headers.Add("X-User-Id", user.Value.ToString());
            if (body is not null) request.Content = new StringContent(body, System.Text.Encoding.UTF8, contentType);
            else request.Content = new StringContent(string.Empty, System.Text.Encoding.UTF8, contentType);
            return await _client.SendAsync(request);
        }

        foreach (var body in new[]
        {
            "{\"name\":\"Invalid date\",\"workspaceType\":\"Trip\",\"baseCurrency\":\"USD\",\"startDate\":\"2026-02-30\"}",
            "{ malformed",
            "null"
        })
        {
            using var response = await PostRaw(body, user: _owner);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().NotContain("2026-02-30").And.NotContain("JsonException");
        }

        using var unsupported = await PostRaw("{}", "text/plain", _owner);
        unsupported.StatusCode.Should().Be(HttpStatusCode.UnsupportedMediaType);
        using var unauthenticated = await PostRaw("{ malformed");
        unauthenticated.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SharedIncomeEndpoint_RecordsRealIncomeAndReportsIt()
    {
        var (id, receiver) = await CreateWorkspace();
        using var created = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner,
            new { description = "Salary", amount = 250m, currency = "USD", receivedByMemberId = receiver, date = "2026-06-10" });
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        using var previousIncome = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner,
            new { description = "Bonus", amount = 150m, currency = "USD", receivedByMemberId = receiver, date = "2026-05-10" });
        previousIncome.StatusCode.Should().Be(HttpStatusCode.Created);
        var income = await Json(created);
        income.GetProperty("amount").GetDecimal().Should().Be(250m);
        income.GetProperty("linkedToLedger").GetBoolean().Should().BeFalse();
        using var dashboard = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/dashboard?year=2026&month=6", _owner);
        var dashboardJson = await Json(dashboard);
        dashboardJson.GetProperty("monthlyIncome").GetDecimal().Should().Be(250m);
        dashboardJson.GetProperty("balance").GetDecimal().Should().Be(400m);
        using var report = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/reports?year=2026&month=6", _owner);
        var reportJson = await Json(report);
        reportJson.GetProperty("income").GetDecimal().Should().Be(250m);
        reportJson.GetProperty("previousMonthIncome").GetDecimal().Should().Be(150m);
    }

    [Fact]
    public async Task SharedIncome_CreditsOnlyReceiverAndKeepsAccountPrivate()
    {
        var receiverUser = Guid.NewGuid();
        var (id, ownerMember) = await CreateWorkspace();
        var receiver = await Join(id, receiverUser);
        var account = await CreateAccount(receiverUser);
        using var created = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner,
            new { description = "Salary", amount = 125m, currency = "USD", receivedByMemberId = receiver, date = "2026-06-12" });
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var incomeId = (await Json(created)).GetProperty("id").GetGuid();
        using var ownerList = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/incomes", _owner);
        var ownerJson = (await Json(ownerList))[0];
        ownerJson.GetProperty("linkedToLedger").GetBoolean().Should().BeFalse();
        ownerJson.TryGetProperty("receivedToAccountId", out _).Should().BeFalse();
        using var linked = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes/{incomeId}/link-account", receiverUser, new { accountId = account });
        linked.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Balance(receiverUser, account)).Should().Be(625m);
        using var privateList = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/incomes", receiverUser);
        var privateIncome = (await Json(privateList))[0];
        privateIncome.GetProperty("linkedToLedger").GetBoolean().Should().BeTrue();
        privateIncome.GetProperty("receivedToAccountId").GetGuid().Should().Be(account);
        using var foreignView = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/incomes", _owner);
        (await Json(foreignView))[0].TryGetProperty("personalTransactionId", out _).Should().BeFalse();
        using var repeated = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes/{incomeId}/link-account", receiverUser, new { accountId = account });
        repeated.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var otherMemberLink = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes/{incomeId}/link-account", _owner, new { accountId = account });
        otherMemberLink.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Balance(receiverUser, account)).Should().Be(625m);
        ownerMember.Should().NotBe(receiver);
    }

    [Fact]
    public async Task SharedIncome_RetryWithSameIdempotencyKeyReturnsSameIncomeAndCreditsOnce()
    {
        var (id, receiver) = await CreateWorkspace();
        var account = await CreateAccount(_owner);
        var body = new
        {
            description = "Salary", amount = 75m, currency = "USD", receivedByMemberId = receiver, date = "2026-06-12",
            receivedToAccountId = account, idempotencyKey = Guid.NewGuid()
        };
        using var first = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner, body);
        using var retry = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner, body);
        first.StatusCode.Should().Be(HttpStatusCode.Created);
        retry.StatusCode.Should().Be(HttpStatusCode.Created, await retry.Content.ReadAsStringAsync());
        (await Json(retry)).GetProperty("id").GetGuid().Should().Be((await Json(first)).GetProperty("id").GetGuid());
        using var list = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/incomes", _owner);
        (await Json(list)).GetArrayLength().Should().Be(1);
        (await Balance(_owner, account)).Should().Be(575m);
        using var scope = _factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<Ledger.Infrastructure.LedgerDbContext>()
            .Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task SharedIncome_ConcurrentLinkAttemptsCreditOnlyOnce()
    {
        var (id, receiver) = await CreateWorkspace();
        var account = await CreateAccount(_owner);
        using var created = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner,
            new { description = "Salary", amount = 75m, currency = "USD", receivedByMemberId = receiver, date = "2026-06-12" });
        var incomeId = (await Json(created)).GetProperty("id").GetGuid();
        var path = $"/v1/workspaces/{id}/incomes/{incomeId}/link-account";
        var attempts = await Task.WhenAll(
            Send(HttpMethod.Post, path, _owner, new { accountId = account }),
            Send(HttpMethod.Post, path, _owner, new { accountId = account }));
        try
        {
            attempts.Count(response => response.StatusCode == HttpStatusCode.OK).Should().Be(1);
            (await Balance(_owner, account)).Should().Be(575m);
            using var scope = _factory.Services.CreateScope();
            (await scope.ServiceProvider.GetRequiredService<Ledger.Infrastructure.LedgerDbContext>()
                .Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(1);
        }
        finally
        {
            foreach (var response in attempts) response.Dispose();
        }
    }

    [Fact]
    public async Task SharedIncome_RejectsUnauthorizedAccountAndInvalidNativeAmountsBeforePosting()
    {
        var receiverUser = Guid.NewGuid();
        var (id, _) = await CreateWorkspace();
        var receiver = await Join(id, receiverUser);
        var ownerAccount = await CreateAccount(_owner);
        using var unauthorized = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner,
            new { description = "Salary", amount = 10m, currency = "USD", receivedByMemberId = receiver, date = "2026-06-12", receivedToAccountId = ownerAccount });
        unauthorized.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var wrongReceiverAccount = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", receiverUser,
            new { description = "Salary", amount = 10m, currency = "USD", receivedByMemberId = receiver, date = "2026-06-12", receivedToAccountId = ownerAccount });
        wrongReceiverAccount.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var inactiveReceiver = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner,
            new { description = "Salary", amount = 10m, currency = "USD", receivedByMemberId = Guid.NewGuid(), date = "2026-06-12" });
        inactiveReceiver.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var precision = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner,
            new { description = "Salary", amount = 10.001m, currency = "USD", receivedByMemberId = receiver, date = "2026-06-12" });
        precision.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var currency = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner,
            new { description = "Salary", amount = 10m, currency = "EUR", receivedByMemberId = receiver, date = "2026-06-12" });
        currency.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var list = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/incomes", _owner);
        (await Json(list)).GetArrayLength().Should().Be(0);
        (await Balance(_owner, ownerAccount)).Should().Be(500m);
    }

    [Fact]
    public async Task SharedIncome_LedgerRequiresReceiverOwnedIncomeCategory()
    {
        var (id, receiver) = await CreateWorkspace();
        var receiverAccount = await CreateAccount(_owner);
        using var expenseCategoryResponse = await Send(HttpMethod.Post, "/v1/categories", _owner,
            new { name = "Expense category", direction = "Expense" });
        using var foreignIncomeCategoryResponse = await Send(HttpMethod.Post, "/v1/categories", Guid.NewGuid(),
            new { name = "Foreign income", direction = "Income" });
        expenseCategoryResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        foreignIncomeCategoryResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var expenseCategory = (await Json(expenseCategoryResponse)).GetProperty("id").GetGuid();
        var foreignIncomeCategory = (await Json(foreignIncomeCategoryResponse)).GetProperty("id").GetGuid();
        foreach (var category in new[] { expenseCategory, foreignIncomeCategory })
        {
            using var response = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner,
                new { description = "Salary", amount = 10m, currency = "USD", receivedByMemberId = receiver, date = "2026-06-12", categoryId = category, receivedToAccountId = receiverAccount });
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
        (await Balance(_owner, receiverAccount)).Should().Be(500m);
    }

    [Fact]
    public async Task SharedIncome_WorkspaceSaveFailureRollsBackLedgerCredit()
    {
        var (id, receiver) = await CreateWorkspace();
        var account = await CreateAccount(_owner);
        _saveFailure.FailNext = true;
        using var failed = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/incomes", _owner,
            new { description = "Salary", amount = 25m, currency = "USD", receivedByMemberId = receiver, date = "2026-06-12", receivedToAccountId = account });
        failed.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        (await Balance(_owner, account)).Should().Be(500m);
        using var list = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/incomes", _owner);
        (await Json(list)).GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task SplitConfiguration_NullArraysAndEntriesReturnClientErrorsWithoutMutation()
    {
        var (id, ownerMember) = await CreateWorkspace();
        var invitee = Guid.NewGuid();
        using var invite = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/invitations", _owner,
            new { email = $"{invitee:N}@example.test" });
        invite.StatusCode.Should().Be(HttpStatusCode.Created);
        var invitationId = (await Json(invite)).GetProperty("id").GetGuid();
        var activeItem = new { memberId = ownerMember, incomeSharePercentage = 100m, customSharePercentage = 100m, responsibilityWeight = 1m };
        var invitationItem = new { invitationId, incomeSharePercentage = 0m, customSharePercentage = 0m, responsibilityWeight = 1m };
        foreach (var invalid in new object[]
        {
            new { defaultSplitRule = "EqualParts", activeMembers = (object?)null, pendingInvitations = new[] { invitationItem } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { activeItem }, pendingInvitations = (object?)null },
            new { defaultSplitRule = "EqualParts", activeMembers = new object?[] { null }, pendingInvitations = new[] { invitationItem } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { activeItem }, pendingInvitations = new object?[] { null } }
        })
        {
            using var response = await Send(HttpMethod.Put, $"/v1/workspaces/{id}/split-configuration", _owner, invalid);
            ((int)response.StatusCode).Should().BeInRange(400, 499);
        }
        using var unchanged = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/split-configuration", _owner);
        (await Json(unchanged)).GetProperty("defaultSplitRule").GetString().Should().Be("EqualParts");
    }

    [Fact]
    public async Task SplitConfiguration_RejectsDuplicateForeignEnumAndInvalidNumericValues()
    {
        var (id, ownerMember) = await CreateWorkspace();
        var inactiveMember = await Join(id, Guid.NewGuid());
        using var removeInactive = await Send(HttpMethod.Delete, $"/v1/workspaces/{id}/members/{inactiveMember}", _owner);
        removeInactive.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var (foreignWorkspaceId, foreignMember) = await CreateWorkspace();
        var foreignInvitee = Guid.NewGuid();
        using var foreignInvite = await Send(HttpMethod.Post, $"/v1/workspaces/{foreignWorkspaceId}/invitations", _owner,
            new { email = $"{foreignInvitee:N}@example.test" });
        foreignInvite.StatusCode.Should().Be(HttpStatusCode.Created);
        var foreignInvitationId = (await Json(foreignInvite)).GetProperty("id").GetGuid();
        var invitee = Guid.NewGuid();
        using var invite = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/invitations", _owner,
            new { email = $"{invitee:N}@example.test" });
        invite.StatusCode.Should().Be(HttpStatusCode.Created);
        var invitationId = (await Json(invite)).GetProperty("id").GetGuid();
        var memberConfiguration = new { memberId = ownerMember, incomeSharePercentage = 100m, customSharePercentage = 100m, responsibilityWeight = 1m };
        var pendingConfiguration = new { invitationId, incomeSharePercentage = 0m, customSharePercentage = 0m, responsibilityWeight = 1m };
        var invalidRequests = new object[]
        {
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { memberConfiguration, memberConfiguration }, pendingInvitations = new[] { pendingConfiguration } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { new { memberId = Guid.NewGuid(), incomeSharePercentage = 100m, customSharePercentage = 100m, responsibilityWeight = 1m } }, pendingInvitations = new[] { pendingConfiguration } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { new { memberId = foreignMember, incomeSharePercentage = 100m, customSharePercentage = 100m, responsibilityWeight = 1m } }, pendingInvitations = new[] { pendingConfiguration } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { new { memberId = inactiveMember, incomeSharePercentage = 100m, customSharePercentage = 100m, responsibilityWeight = 1m } }, pendingInvitations = new[] { pendingConfiguration } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { memberConfiguration }, pendingInvitations = new[] { new { invitationId = foreignInvitationId, incomeSharePercentage = 0m, customSharePercentage = 0m, responsibilityWeight = 1m } } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { memberConfiguration }, pendingInvitations = new[] { pendingConfiguration, pendingConfiguration } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { memberConfiguration }, pendingInvitations = new[] { new { invitationId = Guid.NewGuid(), incomeSharePercentage = 0m, customSharePercentage = 0m, responsibilityWeight = 1m } } },
            new { defaultSplitRule = 99, activeMembers = new[] { memberConfiguration }, pendingInvitations = new[] { pendingConfiguration } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { new { memberId = ownerMember, incomeSharePercentage = 101m, customSharePercentage = 100m, responsibilityWeight = 1m } }, pendingInvitations = new[] { pendingConfiguration } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { new { memberId = ownerMember, incomeSharePercentage = 100.0000001m, customSharePercentage = 100m, responsibilityWeight = 1m } }, pendingInvitations = new[] { pendingConfiguration } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { new { memberId = ownerMember, incomeSharePercentage = 100m, customSharePercentage = 100.0000001m, responsibilityWeight = 1m } }, pendingInvitations = new[] { pendingConfiguration } },
            new { defaultSplitRule = "EqualParts", activeMembers = new[] { new { memberId = ownerMember, incomeSharePercentage = 100m, customSharePercentage = 100m, responsibilityWeight = 1.0000001m } }, pendingInvitations = new[] { pendingConfiguration } },
            new { defaultSplitRule = "ByResponsibility", activeMembers = new[] { new { memberId = ownerMember, incomeSharePercentage = 100m, customSharePercentage = 100m, responsibilityWeight = 0m } }, pendingInvitations = new[] { new { invitationId, incomeSharePercentage = 0m, customSharePercentage = 0m, responsibilityWeight = 0m } } }
        };
        for (var index = 0; index < invalidRequests.Length; index++)
        {
            using var response = await Send(HttpMethod.Put, $"/v1/workspaces/{id}/split-configuration", _owner, invalidRequests[index]);
            ((int)response.StatusCode).Should().BeInRange(400, 499, $"invalid request case {index}");
        }
        using var unchanged = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/split-configuration", _owner);
        var stored = await Json(unchanged);
        stored.GetProperty("defaultSplitRule").GetString().Should().Be("EqualParts");
        stored.GetProperty("activeMembers")[0].GetProperty("incomeSharePercentage").GetDecimal().Should().Be(100m);
        stored.GetProperty("activeMembers")[0].GetProperty("customSharePercentage").GetDecimal().Should().Be(0m);
        stored.GetProperty("pendingInvitations")[0].GetProperty("incomeSharePercentage").GetDecimal().Should().Be(0m);
    }

    [Fact]
    public async Task SplitConfiguration_ExcludesRejectedAndExpiredInvitations()
    {
        var (id, _) = await CreateWorkspace();
        var rejectedUser = Guid.NewGuid();
        using var rejectedInvite = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/invitations", _owner,
            new { email = $"{rejectedUser:N}@example.test" });
        rejectedInvite.StatusCode.Should().Be(HttpStatusCode.Created);
        var rejectedId = (await Json(rejectedInvite)).GetProperty("id").GetGuid();
        using var reject = await Send(HttpMethod.Post, $"/v1/workspaces/invitations/{rejectedId}/reject", rejectedUser);
        reject.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var expiredUser = Guid.NewGuid();
        using var expiredInvite = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/invitations", _owner,
            new { email = $"{expiredUser:N}@example.test" });
        expiredInvite.StatusCode.Should().Be(HttpStatusCode.Created);
        _clock.UtcNow = _clock.UtcNow.AddDays(8);
        using var configuration = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/split-configuration", _owner);
        configuration.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(configuration)).GetProperty("pendingInvitations").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task SplitConfiguration_GetReturnsPersistedDefaultAndReadiness()
    {
        var (id, ownerMember) = await CreateWorkspace();
        using var response = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/split-configuration", _owner);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await Json(response);
        json.GetProperty("defaultSplitRule").GetString().Should().Be("EqualParts");
        json.GetProperty("effectiveSplitRule").GetString().Should().Be("EqualParts");
        json.GetProperty("isSplitConfigurationReady").GetBoolean().Should().BeTrue();
        json.GetProperty("activeMembers")[0].GetProperty("memberId").GetGuid().Should().Be(ownerMember);
    }

    [Fact]
    public async Task SplitConfiguration_PersistsIndependentPlannedSharesAndCopiesOnAcceptance()
    {
        var (id, ownerMember) = await CreateWorkspace();
        var invitee = Guid.NewGuid();
        using var invitationResponse = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/invitations", _owner,
            new { email = $"{invitee:N}@example.test", workspaceRole = "Member" });
        invitationResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var invitationId = (await Json(invitationResponse)).GetProperty("id").GetGuid();
        using var update = await Send(HttpMethod.Put, $"/v1/workspaces/{id}/split-configuration", _owner,
            new
            {
                defaultSplitRule = "IncomeProportional",
                activeMembers = new[] { new { memberId = ownerMember, incomeSharePercentage = 60m, customSharePercentage = 25m, responsibilityWeight = 2m } },
                pendingInvitations = new[] { new { invitationId, incomeSharePercentage = 40m, customSharePercentage = 75m, responsibilityWeight = 3m } }
            });
        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var planned = await Json(update);
        planned.GetProperty("isSplitConfigurationReady").GetBoolean().Should().BeFalse();
        planned.GetProperty("pendingInvitations")[0].GetProperty("customSharePercentage").GetDecimal().Should().Be(75m);
        using var accept = await Send(HttpMethod.Post, $"/v1/workspaces/invitations/{invitationId}/accept", invitee);
        accept.StatusCode.Should().Be(HttpStatusCode.OK);
        using var details = await Send(HttpMethod.Get, $"/v1/workspaces/{id}", _owner);
        var member = (await Json(details)).GetProperty("members").EnumerateArray().Single(x => x.GetProperty("userId").GetGuid() == invitee);
        member.GetProperty("incomeSharePercentage").GetDecimal().Should().Be(40m);
        member.GetProperty("customSharePercentage").GetDecimal().Should().Be(75m);
        member.GetProperty("responsibilityWeight").GetDecimal().Should().Be(3m);
        using var ready = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/split-configuration", _owner);
        (await Json(ready)).GetProperty("isSplitConfigurationReady").GetBoolean().Should().BeTrue();
        using var remove = await Send(HttpMethod.Delete, $"/v1/workspaces/{id}/members/{member.GetProperty("id").GetGuid()}", _owner);
        remove.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var fallback = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/split-configuration", _owner);
        var fallbackJson = await Json(fallback);
        fallbackJson.GetProperty("defaultSplitRule").GetString().Should().Be("IncomeProportional");
        fallbackJson.GetProperty("effectiveSplitRule").GetString().Should().Be("EqualParts");
        fallbackJson.GetProperty("isSplitConfigurationReady").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task SplitConfiguration_RejectsIncompleteBatchWithoutMutationAndPreservesDefaultOnWorkspaceEdits()
    {
        var (id, ownerMember) = await CreateWorkspace();
        var ordinaryUser = Guid.NewGuid();
        var otherMember = await Join(id, ordinaryUser);
        using var denied = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/split-configuration", ordinaryUser);
        denied.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        using var deniedUpdate = await Send(HttpMethod.Put, $"/v1/workspaces/{id}/split-configuration", ordinaryUser,
            new
            {
                defaultSplitRule = "EqualParts",
                activeMembers = new[] { new { memberId = ownerMember, incomeSharePercentage = 100m, customSharePercentage = 100m, responsibilityWeight = 1m },
                    new { memberId = otherMember, incomeSharePercentage = 0m, customSharePercentage = 0m, responsibilityWeight = 1m } },
                pendingInvitations = Array.Empty<object>()
            });
        deniedUpdate.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        using var invalid = await Send(HttpMethod.Put, $"/v1/workspaces/{id}/split-configuration", _owner,
            new
            {
                defaultSplitRule = "IncomeProportional",
                activeMembers = new[]
                {
                    new { memberId = ownerMember, incomeSharePercentage = 70m, customSharePercentage = 0m, responsibilityWeight = 1m },
                    new { memberId = otherMember, incomeSharePercentage = 20m, customSharePercentage = 0m, responsibilityWeight = 1m }
                },
                pendingInvitations = Array.Empty<object>()
            });
        invalid.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var unchanged = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/split-configuration", _owner);
        (await Json(unchanged)).GetProperty("defaultSplitRule").GetString().Should().Be("EqualParts");
        using var valid = await Send(HttpMethod.Put, $"/v1/workspaces/{id}/split-configuration", _owner,
            new
            {
                defaultSplitRule = "IncomeProportional",
                activeMembers = new[]
                {
                    new { memberId = ownerMember, incomeSharePercentage = 80m, customSharePercentage = 10m, responsibilityWeight = 2m },
                    new { memberId = otherMember, incomeSharePercentage = 20m, customSharePercentage = 90m, responsibilityWeight = 3m }
                },
                pendingInvitations = Array.Empty<object>()
            });
        valid.StatusCode.Should().Be(HttpStatusCode.OK);
        using var rename = await Send(HttpMethod.Put, $"/v1/workspaces/{id}", _owner, new { name = "Renamed" });
        rename.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var settings = await Send(HttpMethod.Put, $"/v1/workspaces/{id}/settings", _owner,
            new { showIndividualContributions = false });
        settings.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var details = await Send(HttpMethod.Get, $"/v1/workspaces/{id}", _owner);
        (await Json(details)).GetProperty("defaultSplitRule").GetString().Should().Be("IncomeProportional");
    }

    [Fact]
    public async Task WorkspaceEntry_ListsEmptyThenCreatedWorkspaceAndIsolatesOtherCallers()
    {
        using var empty = await Send(HttpMethod.Get, "/v1/workspaces", _owner);
        empty.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(empty)).GetArrayLength().Should().Be(0);

        using var create = await Send(HttpMethod.Post, "/v1/workspaces", _owner,
            new { name = "Entry workspace", workspaceType = "Roommates", baseCurrency = "USD" });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await Json(create);
        var workspaceId = created.GetProperty("id").GetGuid();

        using var ownerList = await Send(HttpMethod.Get, "/v1/workspaces", _owner);
        ownerList.StatusCode.Should().Be(HttpStatusCode.OK);
        var listed = (await Json(ownerList)).EnumerateArray().Single();
        listed.GetProperty("id").GetGuid().Should().Be(workspaceId);
        listed.GetProperty("name").GetString().Should().Be("Entry workspace");
        listed.GetProperty("role").GetString().Should().Be("Owner");

        using var unrelatedList = await Send(HttpMethod.Get, "/v1/workspaces", Guid.NewGuid());
        unrelatedList.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(unrelatedList)).GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task CreateAndRetrieveWorkspace_RequiresMembership()
    {
        using var create = await Send(HttpMethod.Post, "/v1/workspaces", _owner,
            new { name = "Shared home", workspaceType = "Roommates", baseCurrency = "USD" });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = (await Json(create)).GetProperty("id").GetGuid();
        using var details = await Send(HttpMethod.Get, $"/v1/workspaces/{id}", _owner);
        details.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await Json(details);
        json.GetProperty("name").GetString().Should().Be("Shared home");
        json.GetProperty("members").GetArrayLength().Should().Be(1);
        using var foreign = await Send(HttpMethod.Get, $"/v1/workspaces/{id}", Guid.NewGuid());
        foreign.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var anonymous = await _client.GetAsync("/v1/workspaces");
        anonymous.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SharedExpenseFlow_InvitationBalancesSettlementBudgetAndDashboard()
    {
        var secondUser = Guid.NewGuid();
        var category = await CreateExpenseCategory(_owner);
        var date = new DateOnly(2026, 6, 15);
        var (id, ownerMember) = await CreateWorkspace();
        var member = await Join(id, secondUser);

        using var expense = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/expenses", _owner,
            new
            {
                description = "Groceries",
                amount = 100m,
                currency = "USD",
                paidByMemberId = ownerMember,
                date,
                splitRuleType = "EqualParts",
                categoryId = category,
                participants = new[] { new { memberId = ownerMember }, new { memberId = member } }
            });
        expense.StatusCode.Should().Be(HttpStatusCode.Created);
        var expenseJson = await Json(expense);
        expenseJson.GetProperty("allocations").EnumerateArray().Select(x => x.GetProperty("amount").GetDecimal())
            .Should().Equal(50m, 50m);

        using var balances = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/balances", secondUser);
        var debt = (await Json(balances)).GetProperty("pairwiseBalances")[0];
        debt.GetProperty("debtorMemberId").GetGuid().Should().Be(member);
        debt.GetProperty("creditorMemberId").GetGuid().Should().Be(ownerMember);
        debt.GetProperty("amount").GetDecimal().Should().Be(50m);

        using var overpayment = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/settlements", secondUser,
            new { payerMemberId = member, receiverMemberId = ownerMember, amount = 51m, currency = "USD", settlementDate = date });
        overpayment.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var settle = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/settlements", secondUser,
            new { payerMemberId = member, receiverMemberId = ownerMember, amount = 50m, currency = "USD", settlementDate = date });
        settle.StatusCode.Should().Be(HttpStatusCode.Created);
        using var cleared = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/balances", _owner);
        (await Json(cleared)).GetProperty("pairwiseBalances").GetArrayLength().Should().Be(0);

        using var budget = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/budget", _owner,
            new
            {
                year = 2026,
                month = 6,
                amount = 200m,
                currency = "USD",
                categories = new[] { new { categoryId = category, limitAmount = 150m } }
            });
        budget.StatusCode.Should().Be(HttpStatusCode.OK);
        using var dashboard = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/dashboard?year=2026&month=6", secondUser);
        dashboard.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await Json(dashboard);
        summary.GetProperty("monthlyExpenses").GetDecimal().Should().Be(100m);
        summary.GetProperty("budgetExecutionPercentage").GetDecimal().Should().Be(50m);
        summary.GetProperty("pendingSettlements").GetArrayLength().Should().Be(0);
        using var getBudget = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/budget?year=2026&month=6", _owner);
        (await Json(getBudget)).GetProperty("categories")[0].GetProperty("spentAmount").GetDecimal().Should().Be(100m);
    }

    [Fact]
    public async Task Invitations_RolesAndWorkspaceLifecycle_AreAuthorized()
    {
        var (id, ownerMember) = await CreateWorkspace();
        var secondUser = Guid.NewGuid();
        var member = await Join(id, secondUser);
        using var denied = await Send(HttpMethod.Put, $"/v1/workspaces/{id}", secondUser, new { name = "Denied" });
        denied.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        using var promotion = await Send(HttpMethod.Put, $"/v1/workspaces/{id}/members/{member}", _owner,
            new { workspaceRole = "Admin" });
        promotion.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var update = await Send(HttpMethod.Put, $"/v1/workspaces/{id}", secondUser, new { name = "Updated" });
        update.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var settings = await Send(HttpMethod.Put, $"/v1/workspaces/{id}/settings", _owner,
            new { showIndividualContributions = false });
        settings.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var details = await Send(HttpMethod.Get, $"/v1/workspaces/{id}", _owner);
        var json = await Json(details);
        json.GetProperty("name").GetString().Should().Be("Updated");
        json.GetProperty("settings").GetProperty("showIndividualContributions").GetBoolean().Should().BeFalse();
        using var removeOwner = await Send(HttpMethod.Delete, $"/v1/workspaces/{id}/members/{ownerMember}", secondUser);
        removeOwner.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var remove = await Send(HttpMethod.Delete, $"/v1/workspaces/{id}/members/{member}", _owner);
        remove.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var formerMember = await Send(HttpMethod.Get, $"/v1/workspaces/{id}", secondUser);
        formerMember.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var deactivate = await Send(HttpMethod.Delete, $"/v1/workspaces/{id}", _owner);
        deactivate.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var list = await Send(HttpMethod.Get, "/v1/workspaces", _owner);
        (await Json(list)).GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task GoalsCalendarReportsAndBudgetReplacement_DeriveOnlySharedData()
    {
        var (id, ownerMember) = await CreateWorkspace();
        using var goal = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/goals", _owner,
            new { title = "Trip", targetAmount = 300m, monthlyCommitmentAmount = 25m, currency = "USD", targetDate = "2026-06-30" });
        goal.StatusCode.Should().Be(HttpStatusCode.Created);
        var goalId = (await Json(goal)).GetProperty("id").GetGuid();
        using var contribute = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/goals/{goalId}/contribute", _owner,
            new { amount = 30m, currency = "USD" });
        contribute.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(contribute)).GetProperty("currentAmount").GetDecimal().Should().Be(30m);
        using var goals = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/goals", _owner);
        (await Json(goals))[0].GetProperty("memberContributions").GetArrayLength().Should().Be(1);
        using var createEvent = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/calendar/events", _owner,
            new
            {
                title = "Rent",
                financialEventType = "Payment",
                dueDate = "2026-06-20",
                amount = 100m,
                currency = "USD",
                responsibleMemberId = ownerMember
            });
        createEvent.StatusCode.Should().Be(HttpStatusCode.Created);
        foreach (var amount in new[] { 200m, 250m })
        {
            using var budget = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/budget", _owner,
                new { year = 2026, month = 6, amount, currency = "USD", categories = Array.Empty<object>() });
            budget.StatusCode.Should().Be(HttpStatusCode.OK);
        }
        using var calendar = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/calendar?from=2026-06-01&to=2026-06-30", _owner);
        var events = (await Json(calendar)).EnumerateArray().ToArray();
        events.Should().HaveCount(3);
        events.Select(x => x.GetProperty("financialEventType").GetString()).Should().BeEquivalentTo("Payment", "GoalContribution", "BudgetClose");
        using var report = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/reports?year=2026&month=6", _owner);
        report.StatusCode.Should().Be(HttpStatusCode.OK);
        var reportJson = await Json(report);
        reportJson.GetProperty("previousMonthExpenses").GetDecimal().Should().Be(0m);
        reportJson.GetProperty("savings").GetDecimal().Should().Be(30m);
        using var getBudget = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/budget?year=2026&month=6", _owner);
        (await Json(getBudget)).GetProperty("amount").GetDecimal().Should().Be(250m);
        using var invalidPeriod = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/reports?year=2026&month=13", _owner);
        invalidPeriod.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task FinancialInputs_RejectForeignMembersCurrenciesAndInvalidSplits()
    {
        var (id, ownerMember) = await CreateWorkspace();
        var (foreignWorkspace, foreignMember) = await CreateWorkspace();
        foreach (var participant in new[] { ownerMember, foreignMember })
        {
            using var invalid = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/expenses", _owner,
                new
                {
                    description = "Invalid",
                    amount = 100m,
                    currency = "USD",
                    paidByMemberId = ownerMember,
                    date = "2026-06-15",
                    splitRuleType = "CustomPercentage",
                    participants = new[] { new { memberId = participant, customPercentage = 50m } }
                });
            invalid.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
        using var wrongCurrency = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/expenses", _owner,
            new
            {
                description = "Invalid",
                amount = 100m,
                currency = "EUR",
                paidByMemberId = ownerMember,
                date = "2026-06-15",
                splitRuleType = "EqualParts",
                participants = new[] { new { memberId = ownerMember } }
            });
        wrongCurrency.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var empty = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/expenses", _owner);
        (await Json(empty)).GetArrayLength().Should().Be(0);
        foreach (var path in new[] { "expenses", "balances", "settlements", "budget", "goals", "calendar", "reports", "dashboard" })
        {
            using var foreign = await Send(HttpMethod.Get, $"/v1/workspaces/{foreignWorkspace}/{path}", Guid.NewGuid());
            foreign.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    [Fact]
    public async Task Splits_AssignRoundingResidualToPayer_AndSupportExpenseFilters()
    {
        var (id, ownerMember) = await CreateWorkspace();
        var member = await Join(id, Guid.NewGuid());
        var category = await CreateExpenseCategory(_owner);
        using var expense = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/expenses", _owner,
            new
            {
                description = "Rounding",
                amount = 0.03m,
                currency = "USD",
                paidByMemberId = ownerMember,
                date = "2026-06-15",
                categoryId = category,
                splitRuleType = "EqualParts",
                participants = new[] { new { memberId = member }, new { memberId = ownerMember } }
            });
        expense.StatusCode.Should().Be(HttpStatusCode.Created);
        var allocations = (await Json(expense)).GetProperty("allocations").EnumerateArray();
        allocations.Single(x => x.GetProperty("memberId").GetGuid() == ownerMember)
            .GetProperty("amount").GetDecimal().Should().Be(0.02m);
        using var filtered = await Send(HttpMethod.Get,
            $"/v1/workspaces/{id}/expenses?from=2026-06-01&to=2026-06-30&categoryId={category}&paidByMemberId={ownerMember}&limit=1", _owner);
        (await Json(filtered)).GetArrayLength().Should().Be(1);
        using var offset = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/expenses?offset=1", _owner);
        (await Json(offset)).GetArrayLength().Should().Be(0);
        using var wrongMonth = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/expenses?to=2026-05-31", _owner);
        (await Json(wrongMonth)).GetArrayLength().Should().Be(0);
        using var report = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/reports?year=2026&month=7", _owner);
        var reportJson = await Json(report);
        reportJson.GetProperty("previousMonthExpenses").GetDecimal().Should().Be(0.03m);
        reportJson.GetProperty("expenseChangePercentage").GetDecimal().Should().Be(-100m);
        using var invalid = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/expenses?limit=0", _owner);
        invalid.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Invitations_RejectExpireAndDeactivate_WithoutGrantingAccess()
    {
        var (id, _) = await CreateWorkspace();
        var recipient = Guid.NewGuid();
        using var invite = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/invitations", _owner,
            new { email = $"{recipient:N}@EXAMPLE.TEST", workspaceRole = "Member" });
        invite.StatusCode.Should().Be(HttpStatusCode.Created);
        var invitationId = (await Json(invite)).GetProperty("id").GetGuid();
        using var stolenReject = await Send(HttpMethod.Post, $"/v1/workspaces/invitations/{invitationId}/reject", Guid.NewGuid());
        stolenReject.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var reject = await Send(HttpMethod.Post, $"/v1/workspaces/invitations/{invitationId}/reject", recipient);
        reject.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var acceptRejected = await Send(HttpMethod.Post, $"/v1/workspaces/invitations/{invitationId}/accept", recipient);
        acceptRejected.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var secondInvite = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/invitations", _owner,
            new { email = $"{recipient:N}@example.test" });
        var expiredId = (await Json(secondInvite)).GetProperty("id").GetGuid();
        _clock.UtcNow = _clock.UtcNow.AddDays(8);
        using var expired = await Send(HttpMethod.Post, $"/v1/workspaces/invitations/{expiredId}/accept", recipient);
        expired.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var pending = await Send(HttpMethod.Get, "/v1/workspaces/invitations/pending", recipient);
        (await Json(pending)).GetArrayLength().Should().Be(0);
        using var thirdInvite = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/invitations", _owner,
            new { email = $"{recipient:N}@example.test" });
        var deactivatedId = (await Json(thirdInvite)).GetProperty("id").GetGuid();
        using var deactivate = await Send(HttpMethod.Delete, $"/v1/workspaces/{id}", _owner);
        deactivate.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var inactive = await Send(HttpMethod.Post, $"/v1/workspaces/invitations/{deactivatedId}/accept", recipient);
        inactive.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Goals_EnforceLifecycleMembershipAndContributionPrivacy()
    {
        var (id, _) = await CreateWorkspace();
        var secondUser = Guid.NewGuid();
        await Join(id, secondUser);
        using var goal = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/goals", _owner,
            new { title = "Shared savings", targetAmount = 50m, currency = "USD" });
        var goalId = (await Json(goal)).GetProperty("id").GetGuid();
        using var invalid = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/goals/{goalId}/contribute", secondUser,
            new { amount = -1m, currency = "USD" });
        invalid.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var settings = await Send(HttpMethod.Put, $"/v1/workspaces/{id}/settings", _owner,
            new { showIndividualContributions = false });
        settings.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var contribution = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/goals/{goalId}/contribute", secondUser,
            new { amount = 50m, currency = "USD" });
        var reached = await Json(contribution);
        reached.GetProperty("status").GetString().Should().Be("Reached");
        reached.GetProperty("memberContributions").GetArrayLength().Should().Be(0);
        using var repeated = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/goals/{goalId}/contribute", secondUser,
            new { amount = 1m, currency = "USD" });
        repeated.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var dashboard = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/dashboard?year=2026&month=6", _owner);
        var summary = await Json(dashboard);
        summary.GetProperty("savings").GetDecimal().Should().Be(50m);
        summary.GetProperty("memberContributions").GetArrayLength().Should().Be(0);
        using var privateGoal = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/goals", _owner);
        (await Json(privateGoal))[0].GetProperty("memberContributions").GetArrayLength().Should().Be(0);
        var (otherId, _) = await CreateWorkspace();
        using var foreignGoal = await Send(HttpMethod.Post, $"/v1/workspaces/{otherId}/goals/{goalId}/contribute", _owner,
            new { amount = 1m, currency = "USD" });
        foreignGoal.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ExpenseOnlyReporting_SeparatesMonthlySavingsFromIncomeAndCumulativeExpenses()
    {
        var (id, ownerMember) = await CreateWorkspace();
        var secondUser = Guid.NewGuid();
        var member = await Join(id, secondUser);
        var category = await CreateExpenseCategory(_owner);
        foreach (var (date, amount) in new[] { ("2025-12-15", 100m), ("2026-01-15", 40m) })
        {
            using var expense = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/expenses", _owner,
                new
                {
                    description = "Shared expense",
                    amount,
                    currency = "USD",
                    paidByMemberId = ownerMember,
                    date,
                    categoryId = category,
                    splitRuleType = "EqualParts",
                    participants = new[] { new { memberId = ownerMember }, new { memberId = member } }
                });
            expense.StatusCode.Should().Be(HttpStatusCode.Created);
        }
        using var settlement = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/settlements", secondUser,
            new
            {
                payerMemberId = member,
                receiverMemberId = ownerMember,
                amount = 70m,
                currency = "USD",
                settlementDate = "2026-01-20"
            });
        settlement.StatusCode.Should().Be(HttpStatusCode.Created);

        using var goal = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/goals", _owner,
            new { title = "Shared savings", targetAmount = 500m, monthlyCommitmentAmount = 99m, currency = "USD" });
        goal.StatusCode.Should().Be(HttpStatusCode.Created);
        var goalId = (await Json(goal)).GetProperty("id").GetGuid();
        foreach (var (date, amount) in new[]
        {
            (new DateTime(2025, 12, 31, 23, 59, 59, DateTimeKind.Utc), 20m),
            (new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), 30m),
            (new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc), 50m)
        })
        {
            _clock.UtcNow = date;
            using var contribution = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/goals/{goalId}/contribute", secondUser,
                new { amount, currency = "USD" });
            contribution.StatusCode.Should().Be(HttpStatusCode.OK);
        }
        using var collection = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/calendar/events", _owner,
            new
            {
                title = "Planned collection",
                financialEventType = "Collection",
                dueDate = "2026-01-25",
                amount = 1000m,
                currency = "USD",
                responsibleMemberId = ownerMember
            });
        collection.StatusCode.Should().Be(HttpStatusCode.Created);

        _clock.UtcNow = new DateTime(2026, 1, 20, 12, 0, 0, DateTimeKind.Utc);
        using var report = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/reports", secondUser);
        report.StatusCode.Should().Be(HttpStatusCode.OK);
        var reportJson = await Json(report);
        reportJson.GetProperty("year").GetInt32().Should().Be(2026);
        reportJson.GetProperty("month").GetInt32().Should().Be(1);
        reportJson.GetProperty("currency").GetString().Should().Be("USD");
        reportJson.GetProperty("income").GetDecimal().Should().Be(0m);
        reportJson.GetProperty("previousMonthIncome").GetDecimal().Should().Be(0m);
        reportJson.GetProperty("expenses").GetDecimal().Should().Be(40m);
        reportJson.GetProperty("previousMonthExpenses").GetDecimal().Should().Be(100m);
        reportJson.GetProperty("expenseChangePercentage").GetDecimal().Should().Be(-60m);
        reportJson.GetProperty("savings").GetDecimal().Should().Be(30m);
        var breakdown = reportJson.GetProperty("categoryBreakdown");
        breakdown.GetArrayLength().Should().Be(1);
        breakdown[0].GetProperty("categoryId").GetGuid().Should().Be(category);
        breakdown[0].GetProperty("amount").GetDecimal().Should().Be(40m);
        breakdown[0].GetProperty("percentage").GetDecimal().Should().Be(100m);

        using var dashboard = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/dashboard", secondUser);
        dashboard.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await Json(dashboard);
        summary.GetProperty("balance").GetDecimal().Should().Be(-140m);
        summary.GetProperty("monthlyIncome").GetDecimal().Should().Be(0m);
        summary.GetProperty("monthlyExpenses").GetDecimal().Should().Be(40m);
        summary.GetProperty("savings").GetDecimal().Should().Be(30m);
        summary.GetProperty("pendingSettlements").GetArrayLength().Should().Be(0);
        summary.GetProperty("memberContributions").EnumerateArray()
            .Sum(x => x.GetProperty("goalContributions").GetDecimal()).Should().Be(30m);
    }

    [Fact]
    public async Task ExpenseOnlyReporting_EmptyWorkspaceHasZeroTotalsAndNoComparison()
    {
        var (populatedId, ownerMember) = await CreateWorkspace();
        using var expense = await Send(HttpMethod.Post, $"/v1/workspaces/{populatedId}/expenses", _owner,
            new
            {
                description = "Other workspace expense",
                amount = 100m,
                currency = "USD",
                paidByMemberId = ownerMember,
                date = "2026-06-15",
                splitRuleType = "EqualParts",
                participants = new[] { new { memberId = ownerMember } }
            });
        expense.StatusCode.Should().Be(HttpStatusCode.Created);
        var (id, _) = await CreateWorkspace();

        using var report = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/reports", _owner);
        report.StatusCode.Should().Be(HttpStatusCode.OK);
        var reportJson = await Json(report);
        foreach (var field in new[] { "income", "expenses", "savings", "previousMonthIncome", "previousMonthExpenses" })
            reportJson.GetProperty(field).GetDecimal().Should().Be(0m);
        reportJson.GetProperty("expenseChangePercentage").ValueKind.Should().Be(JsonValueKind.Null);
        reportJson.GetProperty("categoryBreakdown").GetArrayLength().Should().Be(0);

        using var dashboard = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/dashboard", _owner);
        dashboard.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await Json(dashboard);
        foreach (var field in new[] { "balance", "monthlyIncome", "monthlyExpenses", "savings", "budgetExecutionPercentage" })
            summary.GetProperty(field).GetDecimal().Should().Be(0m);
        summary.GetProperty("budget").ValueKind.Should().Be(JsonValueKind.Null);
        summary.GetProperty("pendingSettlements").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task LedgerExpense_DebitsFullAmount_AndKeepsAccountPrivate()
    {
        var (id, payer) = await CreateWorkspace();
        var otherUser = Guid.NewGuid();
        var other = await Join(id, otherUser);
        var account = await CreateAccount(_owner);
        var otherAccount = await CreateAccount(otherUser);
        using var response = await RegisterExpense(id, payer, other, _owner, account);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var expense = await Json(response);
        expense.GetProperty("linkedToLedger").GetBoolean().Should().BeTrue();
        expense.GetProperty("paidFromAccountId").GetGuid().Should().Be(account);
        (await Balance(_owner, account)).Should().Be(400m);
        using var list = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/expenses", otherUser);
        var privateExpense = (await Json(list))[0];
        privateExpense.GetProperty("linkedToLedger").GetBoolean().Should().BeTrue();
        privateExpense.TryGetProperty("paidFromAccountId", out var privateAccount).Should().BeFalse();
        using var accounts = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/my-accounts", otherUser);
        accounts.StatusCode.Should().Be(HttpStatusCode.OK);
        var ownAccounts = (await Json(accounts)).EnumerateArray().ToArray();
        ownAccounts.Should().ContainSingle();
        ownAccounts[0].GetProperty("id").GetGuid().Should().Be(otherAccount);
        ownAccounts[0].TryGetProperty("balance", out _).Should().BeFalse();
        using var outsider = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/my-accounts", Guid.NewGuid());
        outsider.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task LedgerExpense_InvalidDebitDoesNotPersistExpense()
    {
        var (id, payer) = await CreateWorkspace();
        var otherUser = Guid.NewGuid();
        var other = await Join(id, otherUser);
        var ownAccount = await CreateAccount(_owner);
        var foreignAccount = await CreateAccount(otherUser);
        using var notPayer = await RegisterExpense(id, payer, other, otherUser, foreignAccount);
        notPayer.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await notPayer.Content.ReadAsStringAsync()).Should().Contain("Workspace.OnlyPayerCanDebitAccount");
        using var foreign = await RegisterExpense(id, payer, other, _owner, foreignAccount);
        foreign.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var precision = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/expenses", _owner, new
        {
            description = "Invalid precision",
            amount = 100.001m,
            currency = "USD",
            paidByMemberId = payer,
            paidFromAccountId = ownAccount,
            date = "2026-06-15",
            splitRuleType = "EqualParts",
            participants = new[] { new { memberId = payer }, new { memberId = other } }
        });
        precision.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var wrongCurrencyAccount = await CreateAccount(_owner, "BOB");
        using var currency = await RegisterExpense(id, payer, other, _owner, wrongCurrencyAccount);
        currency.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var list = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/expenses", _owner);
        (await Json(list)).GetArrayLength().Should().Be(0);
        (await Balance(_owner, ownAccount)).Should().Be(500m);
        (await Balance(otherUser, foreignAccount)).Should().Be(500m);
    }

    [Fact]
    public async Task LedgerExpense_LinkAccountOnlyOnceAndOnlyByPayer()
    {
        var (id, payer) = await CreateWorkspace();
        var otherUser = Guid.NewGuid();
        var other = await Join(id, otherUser);
        var account = await CreateAccount(_owner);
        using var create = await RegisterExpense(id, payer, other, otherUser);
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var expense = await Json(create);
        expense.GetProperty("linkedToLedger").GetBoolean().Should().BeFalse();
        var expenseId = expense.GetProperty("id").GetGuid();
        var path = $"/v1/workspaces/{id}/expenses/{expenseId}/link-account";
        using var denied = await Send(HttpMethod.Post, path, otherUser, new { accountId = account });
        denied.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var linked = await Send(HttpMethod.Post, path, _owner, new { accountId = account });
        linked.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(linked)).GetProperty("linkedToLedger").GetBoolean().Should().BeTrue();
        using var repeated = await Send(HttpMethod.Post, path, _owner, new { accountId = account });
        repeated.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Balance(_owner, account)).Should().Be(400m);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LedgerSettlements_LinkEachOwnSideWithoutCountingIncomeOrExpense(bool linkOnCreate)
    {
        var (id, receiver) = await CreateWorkspace();
        var payerUser = Guid.NewGuid();
        var payer = await Join(id, payerUser);
        var receiverAccount = await CreateAccount(_owner);
        var payerAccount = await CreateAccount(payerUser);
        using var expense = await RegisterExpense(id, receiver, payer, _owner, receiverAccount);
        expense.StatusCode.Should().Be(HttpStatusCode.Created);
        using var settlement = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/settlements", payerUser,
            new
            {
                payerMemberId = payer,
                receiverMemberId = receiver,
                amount = 50m,
                currency = "USD",
                settlementDate = "2026-06-15",
                payerAccountId = linkOnCreate ? payerAccount : (Guid?)null
            });
        settlement.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await Json(settlement);
        json.GetProperty("payerLinked").GetBoolean().Should().Be(linkOnCreate);
        json.GetProperty("receiverLinked").GetBoolean().Should().BeFalse();
        var path = $"/v1/workspaces/{id}/settlements/{json.GetProperty("id").GetGuid()}/link-account";
        using var foreign = await Send(HttpMethod.Post, path, _owner, new { accountId = payerAccount });
        foreign.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        if (!linkOnCreate)
        {
            using var linkPayer = await Send(HttpMethod.Post, path, payerUser, new { accountId = payerAccount });
            linkPayer.StatusCode.Should().Be(HttpStatusCode.OK);
        }
        using var linkReceiver = await Send(HttpMethod.Post, path, _owner, new { accountId = receiverAccount });
        linkReceiver.StatusCode.Should().Be(HttpStatusCode.OK);
        var linked = await Json(linkReceiver);
        linked.GetProperty("payerLinked").GetBoolean().Should().BeTrue();
        linked.GetProperty("receiverLinked").GetBoolean().Should().BeTrue();
        linked.EnumerateObject().Select(x => x.Name).Should().NotContain(x => x.Contains("AccountId", StringComparison.OrdinalIgnoreCase));
        foreach (var user in new[] { _owner, payerUser })
        {
            using var repeated = await Send(HttpMethod.Post, path, user, new { accountId = receiverAccount });
            repeated.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
        using var payerTransactions = await Send(HttpMethod.Get, $"/v1/transactions?accountId={payerAccount}", payerUser);
        var legId = (await Json(payerTransactions))[0].GetProperty("id").GetGuid();
        using var editLeg = await Send(HttpMethod.Put, $"/v1/transactions/{legId}", payerUser,
            new { accountId = payerAccount, amount = 25m, direction = "Expense" });
        editLeg.StatusCode.Should().Be(HttpStatusCode.Conflict);
        using var reverseLeg = await Send(HttpMethod.Post, $"/v1/transactions/{legId}/reverse", payerUser, new { reason = "Wrong route" });
        reverseLeg.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await Balance(_owner, receiverAccount)).Should().Be(450m);
        (await Balance(payerUser, payerAccount)).Should().Be(450m);
        using var scope = _factory.Services.CreateScope();
        var ledger = scope.ServiceProvider.GetRequiredService<Ledger.Contracts.ILedgerModule>();
        var start = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var receiverMetrics = await ledger.GetMonthlyHealthMetricsAsync(_owner, start, start.AddMonths(1));
        receiverMetrics.Should().ContainSingle().Which.MonthlyIncome.Should().Be(0m);
        receiverMetrics.Single().MonthlyExpenses.Should().Be(100m);
        var payerMetrics = await ledger.GetMonthlyHealthMetricsAsync(payerUser, start, start.AddMonths(1));
        payerMetrics.Should().ContainSingle().Which.MonthlyExpenses.Should().Be(0m);
        payerMetrics.Single().MonthlyIncome.Should().Be(0m);
        using var report = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/reports?year=2026&month=6", _owner);
        (await Json(report)).GetProperty("income").GetDecimal().Should().Be(0m);
        using var dashboard = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/dashboard?year=2026&month=6", _owner);
        var dashboardMetrics = await Json(dashboard);
        dashboardMetrics.GetProperty("monthlyIncome").GetDecimal().Should().Be(0m);
        dashboardMetrics.GetProperty("balance").GetDecimal().Should().Be(-100m);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LedgerExpense_WorkspaceSaveFailureRollsBackBothContexts(bool linkExisting)
    {
        var (id, payer) = await CreateWorkspace();
        var other = await Join(id, Guid.NewGuid());
        var account = await CreateAccount(_owner);
        Guid? expenseId = null;
        if (linkExisting)
        {
            using var create = await RegisterExpense(id, payer, other, _owner);
            expenseId = (await Json(create)).GetProperty("id").GetGuid();
        }
        _saveFailure.FailNext = true;
        using var failed = linkExisting
            ? await Send(HttpMethod.Post, $"/v1/workspaces/{id}/expenses/{expenseId}/link-account", _owner, new { accountId = account })
            : await RegisterExpense(id, payer, other, _owner, account);
        failed.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        (await Balance(_owner, account)).Should().Be(500m);
        using var list = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/expenses", _owner);
        var expenses = await Json(list);
        expenses.GetArrayLength().Should().Be(linkExisting ? 1 : 0);
        if (linkExisting) expenses[0].GetProperty("linkedToLedger").GetBoolean().Should().BeFalse();
        using var scope = _factory.Services.CreateScope();
        var ledger = scope.ServiceProvider.GetRequiredService<Ledger.Contracts.ILedgerModule>();
        var start = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        (await ledger.GetMonthlyHealthMetricsAsync(_owner, start, start.AddMonths(1)))
            .Single().MonthlyExpenses.Should().Be(0m);
        using var ledgerScope = _factory.Services.CreateScope();
        (await ledgerScope.ServiceProvider.GetRequiredService<Ledger.Infrastructure.LedgerDbContext>()
            .Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task LedgerExpense_ConcurrentLinkAttemptsPostOnlyOneDebit()
    {
        var (id, payer) = await CreateWorkspace();
        var other = await Join(id, Guid.NewGuid());
        var account = await CreateAccount(_owner);
        using var created = await RegisterExpense(id, payer, other, _owner);
        var expenseId = (await Json(created)).GetProperty("id").GetGuid();
        var path = $"/v1/workspaces/{id}/expenses/{expenseId}/link-account";
        var attempts = await Task.WhenAll(
            Send(HttpMethod.Post, path, _owner, new { accountId = account }),
            Send(HttpMethod.Post, path, _owner, new { accountId = account }));
        try
        {
            attempts.Count(response => response.StatusCode == HttpStatusCode.OK).Should().Be(1);
            (await Balance(_owner, account)).Should().Be(400m);
            using var scope = _factory.Services.CreateScope();
            (await scope.ServiceProvider.GetRequiredService<Ledger.Infrastructure.LedgerDbContext>()
                .Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(1);
        }
        finally
        {
            foreach (var response in attempts) response.Dispose();
        }
    }

    [Fact]
    public async Task LedgerSettlement_RetryWithSameIdempotencyKeyReturnsSameSettlementAndPostsOneLeg()
    {
        var (id, receiver) = await CreateWorkspace();
        var payerUser = Guid.NewGuid();
        var payer = await Join(id, payerUser);
        var payerAccount = await CreateAccount(payerUser);
        using var expense = await RegisterExpense(id, receiver, payer, _owner);
        expense.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = new
        {
            payerMemberId = payer, receiverMemberId = receiver, amount = 50m, currency = "USD", settlementDate = "2026-06-15",
            payerAccountId = payerAccount, idempotencyKey = Guid.NewGuid()
        };
        using var first = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/settlements", payerUser, body);
        using var retry = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/settlements", payerUser, body);
        first.StatusCode.Should().Be(HttpStatusCode.Created);
        retry.StatusCode.Should().Be(HttpStatusCode.Created, await retry.Content.ReadAsStringAsync());
        (await Json(retry)).GetProperty("id").GetGuid().Should().Be((await Json(first)).GetProperty("id").GetGuid());
        using var list = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/settlements", payerUser);
        (await Json(list)).GetArrayLength().Should().Be(1);
        (await Balance(payerUser, payerAccount)).Should().Be(450m);
    }

    [Fact]
    public async Task LedgerSettlement_ConcurrentSameSideLinkPostsOnlyOneLeg()
    {
        var (id, receiver) = await CreateWorkspace();
        var payerUser = Guid.NewGuid();
        var payer = await Join(id, payerUser);
        using var expense = await RegisterExpense(id, receiver, payer, _owner);
        var payerAccount = await CreateAccount(payerUser);
        using var settlementResponse = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/settlements", payerUser,
            new { payerMemberId = payer, receiverMemberId = receiver, amount = 50m, currency = "USD", settlementDate = "2026-06-15" });
        var settlementId = (await Json(settlementResponse)).GetProperty("id").GetGuid();
        var path = $"/v1/workspaces/{id}/settlements/{settlementId}/link-account";
        var attempts = await Task.WhenAll(
            Send(HttpMethod.Post, path, payerUser, new { accountId = payerAccount }),
            Send(HttpMethod.Post, path, payerUser, new { accountId = payerAccount }));
        try
        {
            attempts.Count(response => response.StatusCode == HttpStatusCode.OK).Should().Be(1);
            (await Balance(payerUser, payerAccount)).Should().Be(450m);
            using var scope = _factory.Services.CreateScope();
            (await scope.ServiceProvider.GetRequiredService<Ledger.Infrastructure.LedgerDbContext>()
                .Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(1); // one settlement leg
        }
        finally
        {
            foreach (var response in attempts) response.Dispose();
        }
    }

    [Fact]
    public async Task LedgerExpense_LedgerCommitFailureRollsBackWorkspaceAndDebit()
    {
        var (id, payer) = await CreateWorkspace();
        var other = await Join(id, Guid.NewGuid());
        var account = await CreateAccount(_owner);
        _ledgerCommitFailure.FailNext = true;
        using var failed = await RegisterExpense(id, payer, other, _owner, account);
        failed.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        (await Balance(_owner, account)).Should().Be(500m);
        using var expenses = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/expenses", _owner);
        (await Json(expenses)).GetArrayLength().Should().Be(0);
        using var scope = _factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<Ledger.Infrastructure.LedgerDbContext>()
            .Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task LedgerExpense_WorkspaceCancellationRollsBackLedgerDebit()
    {
        var (id, payer) = await CreateWorkspace();
        var other = await Join(id, Guid.NewGuid());
        var account = await CreateAccount(_owner);
        _saveFailure.CancelNext = true;
        using var cancelled = await RegisterExpense(id, payer, other, _owner, account);
        cancelled.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        (await Balance(_owner, account)).Should().Be(500m);
        using var expenses = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/expenses", _owner);
        (await Json(expenses)).GetArrayLength().Should().Be(0);
        using var scope = _factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<Ledger.Infrastructure.LedgerDbContext>()
            .Transactions.IgnoreQueryFilters().CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task LedgerSettlement_RejectsNonPayerAccountOnCreateWithoutPersisting()
    {
        var (id, receiver) = await CreateWorkspace();
        var payerUser = Guid.NewGuid();
        var payer = await Join(id, payerUser);
        var account = await CreateAccount(_owner);
        using var expense = await RegisterExpense(id, receiver, payer, _owner);
        using var denied = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/settlements", _owner,
            new
            {
                payerMemberId = payer,
                receiverMemberId = receiver,
                amount = 50m,
                currency = "USD",
                settlementDate = "2026-06-15",
                payerAccountId = account
            });
        denied.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await denied.Content.ReadAsStringAsync()).Should().Contain("Workspace.OnlyPayerCanDebitAccount");
        using var list = await Send(HttpMethod.Get, $"/v1/workspaces/{id}/settlements", _owner);
        (await Json(list)).GetArrayLength().Should().Be(0);
        (await Balance(_owner, account)).Should().Be(500m);
    }

    private sealed class FailWorkspaceSave : SaveChangesInterceptor
    {
        public bool FailNext { get; set; }
        public bool CancelNext { get; set; }
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (CancelNext)
            {
                CancelNext = false;
                throw new OperationCanceledException("Simulated workspace persistence cancellation.");
            }
            if (FailNext)
            {
                FailNext = false;
                throw new InvalidOperationException("Simulated workspace persistence failure.");
            }
            return ValueTask.FromResult(result);
        }
    }

    private sealed class FailLedgerCommit : DbTransactionInterceptor
    {
        public bool FailNext { get; set; }

        public override ValueTask<InterceptionResult> TransactionCommittingAsync(DbTransaction transaction, TransactionEventData eventData,
            InterceptionResult result, CancellationToken cancellationToken = default)
        {
            if (FailNext)
            {
                FailNext = false;
                throw new InvalidOperationException("Simulated Ledger transaction commit failure.");
            }
            return ValueTask.FromResult(result);
        }
    }

    private Task<HttpResponseMessage> RegisterExpense(Guid id, Guid payer, Guid other, Guid user, Guid? account = null) =>
        Send(HttpMethod.Post, $"/v1/workspaces/{id}/expenses", user, new
        {
            description = "Shared groceries",
            amount = 100m,
            currency = "USD",
            paidByMemberId = payer,
            date = "2026-06-15",
            splitRuleType = "EqualParts",
            paidFromAccountId = account,
            participants = new[] { new { memberId = payer }, new { memberId = other } }
        });

    private async Task<Guid> CreateAccount(Guid user, string currency = "USD")
    {
        using var response = await Send(HttpMethod.Post, "/v1/accounts", user,
            new { name = "Personal cash", type = "Cash", currency, initialBalance = 500m });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    private async Task<Guid> CreateExpenseCategory(Guid user)
    {
        using var response = await Send(HttpMethod.Post, "/v1/categories", user,
            new { name = "Shared expense category", direction = "Expense" });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    private async Task<decimal> Balance(Guid user, Guid account)
    {
        using var response = await Send(HttpMethod.Get, "/v1/accounts", user);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await Json(response)).EnumerateArray().Single(x => x.GetProperty("id").GetGuid() == account)
            .GetProperty("balance").GetDecimal();
    }

    private sealed class TestClock : IClock
    {
        public DateTime UtcNow { get; set; } = new(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly TodayUtc => DateOnly.FromDateTime(UtcNow);
    }

    private async Task<(Guid Id, Guid Member)> CreateWorkspace()
    {
        using var create = await Send(HttpMethod.Post, "/v1/workspaces", _owner,
            new { name = "Shared home", workspaceType = "Roommates", baseCurrency = "USD" });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = (await Json(create)).GetProperty("id").GetGuid();
        using var details = await Send(HttpMethod.Get, $"/v1/workspaces/{id}", _owner);
        return (id, (await Json(details)).GetProperty("members")[0].GetProperty("id").GetGuid());
    }

    private async Task<Guid> Join(Guid id, Guid user)
    {
        using var invite = await Send(HttpMethod.Post, $"/v1/workspaces/{id}/invitations", _owner,
            new { email = $"{user:N}@example.test", workspaceRole = "Member" });
        invite.StatusCode.Should().Be(HttpStatusCode.Created);
        var invitation = (await Json(invite)).GetProperty("id").GetGuid();
        using var stolen = await Send(HttpMethod.Post, $"/v1/workspaces/invitations/{invitation}/accept", Guid.NewGuid());
        stolen.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var pending = await Send(HttpMethod.Get, "/v1/workspaces/invitations/pending", user);
        (await Json(pending)).GetArrayLength().Should().Be(1);
        using var accept = await Send(HttpMethod.Post, $"/v1/workspaces/invitations/{invitation}/accept", user);
        accept.StatusCode.Should().Be(HttpStatusCode.OK);
        using var repeated = await Send(HttpMethod.Post, $"/v1/workspaces/invitations/{invitation}/accept", user);
        repeated.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        return (await Json(accept)).GetProperty("id").GetGuid();
    }

    private sealed class WorkspaceTestIdentity : IIdentityModule
    {
        public Task<Result<AuthResponseDto>> RegisterWithPasswordAsync(RegisterWithPasswordRequest request, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result<AuthResponseDto>> LoginWithPasswordAsync(LoginWithPasswordRequest request, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result<UserDto>> GetCurrentUserAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Result.Success(new UserDto(userId, $"{userId:N}@example.test", "Test member", null,
                "USD", new DateTime(2026, 1, 1), "Western", 2)));
        public Task<Result<AuthResponseDto>> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result<AuthResponseDto>> RefreshTokenAsync(string refreshToken, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result<UserDto>> UpdatePreferredCurrencyAsync(Guid userId, string preferredCurrency, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result<UserDto>> UpdateNumberFormatPreferencesAsync(Guid userId, string groupingConvention, int maximumDecimalPlaces, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result> LogoutAsync(string refreshToken, Guid? userId = null, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result> RequestAccountDeletionAsync(Guid userId, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result<UserDataExportDto>> ExportUserDataAsync(Guid userId, CancellationToken ct = default) => throw new NotSupportedException();
    }

    private async Task<HttpResponseMessage> Send(HttpMethod method, string path, Guid user, object? body = null)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("X-User-Id", user.ToString());
        if (body is not null) request.Content = JsonContent.Create(body);
        return await _client.SendAsync(request);
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        _connection.Dispose();
    }
}
