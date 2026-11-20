using System.Text.Json;
using Api.Common;
using Microsoft.Extensions.Options;
using BuildingBlocks.Time;
using Workspaces.Application.Services;
using Workspaces.Contracts;

namespace Api.Endpoints;

public static class WorkspacesEndpoints
{
    public static RouteGroupBuilder MapWorkspacesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/workspaces").WithTags("Workspaces").RequireAuthorization();

        group.MapPost("/", async (HttpRequest httpRequest, IWorkspaceService service,
            IOptions<Microsoft.AspNetCore.Http.Json.JsonOptions> jsonOptions, CancellationToken ct) =>
        {
            if (!httpRequest.HasJsonContentType())
                return Results.Problem(statusCode: StatusCodes.Status415UnsupportedMediaType, title: "Unsupported media type.");

            CreateWorkspaceRequest? request;
            try
            {
                request = await httpRequest.ReadFromJsonAsync<CreateWorkspaceRequest>(jsonOptions.Value.SerializerOptions, ct);
            }
            catch (JsonException)
            {
                return Results.Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid request body.");
            }
            catch (BadHttpRequestException exception)
            {
                return Results.Problem(statusCode: exception.StatusCode, title: "Invalid request body.");
            }

            if (request is null)
                return Results.Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid request body.");

            return (await service.CreateAsync(request, ct)).ToHttpResult(value =>
                Results.Created($"/v1/workspaces/{value.Id}", value));
        })
            .WithName("CreateWorkspace")
            .Accepts<CreateWorkspaceRequest>("application/json")
            .Produces<CreateWorkspaceResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status413PayloadTooLarge)
            .ProducesProblem(StatusCodes.Status415UnsupportedMediaType);
        group.MapGet("/", async (IWorkspaceService service, CancellationToken ct) =>
            (await service.ListAsync(ct)).ToHttpResult()).WithName("ListWorkspaces");
        group.MapGet("/{id:guid}", async (Guid id, IWorkspaceService service, CancellationToken ct) =>
            (await service.GetAsync(id, ct)).ToHttpResult()).WithName("GetWorkspace");
        group.MapPut("/{id:guid}", async (Guid id, UpdateWorkspaceRequest request, IWorkspaceService service, CancellationToken ct) =>
            (await service.UpdateAsync(id, request, ct)).ToHttpResult(() => Results.NoContent())).WithName("UpdateWorkspace");
        group.MapGet("/{id:guid}/split-configuration", async (Guid id, IWorkspaceService service, CancellationToken ct) =>
            (await service.GetSplitConfigurationAsync(id, ct)).ToHttpResult()).WithName("GetWorkspaceSplitConfiguration");
        group.MapPut("/{id:guid}/split-configuration", async (Guid id, UpdateSplitConfigurationRequest request, IWorkspaceService service, CancellationToken ct) =>
            (await service.UpdateSplitConfigurationAsync(id, request, ct)).ToHttpResult()).WithName("UpdateWorkspaceSplitConfiguration");
        group.MapPut("/{id:guid}/settings", async (Guid id, UpdateWorkspaceSettingsRequest request, IWorkspaceService service, CancellationToken ct) =>
            (await service.UpdateSettingsAsync(id, request, ct)).ToHttpResult(() => Results.NoContent())).WithName("UpdateWorkspaceSettings");
        group.MapDelete("/{id:guid}", async (Guid id, IWorkspaceService service, CancellationToken ct) =>
            (await service.DeactivateAsync(id, ct)).ToHttpResult(() => Results.NoContent())).WithName("DeactivateWorkspace");

        group.MapPost("/{id:guid}/invitations", async (Guid id, InviteMemberRequest request, IWorkspaceService service, CancellationToken ct) =>
            (await service.InviteAsync(id, request, ct)).ToHttpResult(value => Results.Created($"/v1/workspaces/invitations/{value.Id}", value)))
            .WithName("InviteWorkspaceMember");
        group.MapGet("/invitations/pending", async (IWorkspaceService service, CancellationToken ct) =>
            (await service.PendingInvitationsAsync(ct)).ToHttpResult()).WithName("PendingWorkspaceInvitations");
        group.MapPost("/invitations/{invitationId:guid}/accept", async (Guid invitationId, IWorkspaceService service, CancellationToken ct) =>
            (await service.AcceptAsync(invitationId, ct)).ToHttpResult()).WithName("AcceptWorkspaceInvitation");
        group.MapPost("/invitations/{invitationId:guid}/reject", async (Guid invitationId, IWorkspaceService service, CancellationToken ct) =>
            (await service.RejectAsync(invitationId, ct)).ToHttpResult(() => Results.NoContent())).WithName("RejectWorkspaceInvitation");
        group.MapPut("/{id:guid}/members/{memberId:guid}", async (Guid id, Guid memberId, UpdateMemberRoleRequest request,
            IWorkspaceService service, CancellationToken ct) =>
            (await service.UpdateRoleAsync(id, memberId, request, ct)).ToHttpResult(() => Results.NoContent())).WithName("UpdateWorkspaceMemberRole");
        group.MapDelete("/{id:guid}/members/{memberId:guid}", async (Guid id, Guid memberId, IWorkspaceService service, CancellationToken ct) =>
            (await service.RemoveMemberAsync(id, memberId, ct)).ToHttpResult(() => Results.NoContent())).WithName("RemoveWorkspaceMember");

        group.MapGet("/{id:guid}/my-accounts", async (Guid id, IWorkspaceService service, CancellationToken ct) =>
            (await service.GetMyAccountsAsync(id, ct)).ToHttpResult()).WithName("GetWorkspaceMyAccounts")
            .Produces<IReadOnlyList<WorkspaceAccountDto>>();
        group.MapPost("/{id:guid}/expenses/{expenseId:guid}/link-account", async (Guid id, Guid expenseId,
            LinkWorkspaceAccountRequest request, IWorkspaceExpenseService service, CancellationToken ct) =>
            (await service.LinkAccountAsync(id, expenseId, request, ct)).ToHttpResult()).WithName("LinkWorkspaceExpenseAccount")
            .Produces<WorkspaceExpenseDto>();
        group.MapPost("/{id:guid}/settlements/{settlementId:guid}/link-account", async (Guid id, Guid settlementId,
            LinkWorkspaceAccountRequest request, IWorkspaceBalanceService service, CancellationToken ct) =>
            (await service.LinkAccountAsync(id, settlementId, request, ct)).ToHttpResult()).WithName("LinkWorkspaceSettlementAccount")
            .Produces<SettlementDto>();
        group.MapGet("/{id:guid}/dashboard", async (Guid id, int? year, int? month, IClock clock, IWorkspaceDashboardService service, CancellationToken ct) =>
            (await service.GetAsync(id, year ?? clock.UtcNow.Year, month ?? clock.UtcNow.Month, ct)).ToHttpResult()).WithName("GetWorkspaceDashboard");
        group.MapPost("/{id:guid}/incomes", async (Guid id, RegisterWorkspaceIncomeRequest request, IWorkspaceIncomeService service, CancellationToken ct) =>
            (await service.RegisterAsync(id, request, ct)).ToHttpResult(value => Results.Created($"/v1/workspaces/{id}/incomes/{value.Id}", value)))
            .WithName("RegisterWorkspaceIncome").Produces<WorkspaceIncomeDto>(StatusCodes.Status201Created);
        group.MapGet("/{id:guid}/incomes", async (Guid id, DateOnly? from, DateOnly? to, Guid? categoryId, Guid? receivedByMemberId,
            int? limit, int? offset, IWorkspaceIncomeService service, CancellationToken ct) =>
            (await service.ListAsync(id, new WorkspaceIncomeFilter(from, to, categoryId, receivedByMemberId, limit ?? 100, offset ?? 0), ct)).ToHttpResult())
            .WithName("ListWorkspaceIncomes").Produces<IReadOnlyList<WorkspaceIncomeDto>>();
        group.MapPost("/{id:guid}/incomes/{incomeId:guid}/link-account", async (Guid id, Guid incomeId,
            LinkWorkspaceIncomeAccountRequest request, IWorkspaceIncomeService service, CancellationToken ct) =>
            (await service.LinkAccountAsync(id, incomeId, request, ct)).ToHttpResult()).WithName("LinkWorkspaceIncomeAccount")
            .Produces<WorkspaceIncomeDto>();
        group.MapPost("/{id:guid}/expenses", async (Guid id, RegisterWorkspaceExpenseRequest request, IWorkspaceExpenseService service, CancellationToken ct) =>
            (await service.RegisterAsync(id, request, ct)).ToHttpResult(value => Results.Created($"/v1/workspaces/{id}/expenses/{value.Id}", value)))
            .WithName("RegisterWorkspaceExpense").Produces<WorkspaceExpenseDto>(StatusCodes.Status201Created);
        group.MapGet("/{id:guid}/expenses", async (Guid id, DateOnly? from, DateOnly? to, Guid? categoryId, Guid? paidByMemberId,
            int? limit, int? offset, IWorkspaceExpenseService service, CancellationToken ct) =>
            (await service.ListAsync(id, new WorkspaceExpenseFilter(from, to, categoryId, paidByMemberId, limit ?? 100, offset ?? 0), ct)).ToHttpResult())
            .WithName("ListWorkspaceExpenses").Produces<IReadOnlyList<WorkspaceExpenseDto>>();
        group.MapGet("/{id:guid}/balances", async (Guid id, IWorkspaceBalanceService service, CancellationToken ct) =>
            (await service.GetAsync(id, ct)).ToHttpResult()).WithName("GetWorkspaceBalances");
        group.MapPost("/{id:guid}/settlements", async (Guid id, SettleBalanceRequest request, IWorkspaceBalanceService service, CancellationToken ct) =>
            (await service.SettleAsync(id, request, ct)).ToHttpResult(value => Results.Created($"/v1/workspaces/{id}/settlements/{value.Id}", value)))
            .WithName("SettleWorkspaceBalance").Produces<SettlementDto>(StatusCodes.Status201Created);
        group.MapGet("/{id:guid}/settlements", async (Guid id, IWorkspaceBalanceService service, CancellationToken ct) =>
            (await service.ListSettlementsAsync(id, ct)).ToHttpResult()).WithName("ListWorkspaceSettlements")
            .Produces<IReadOnlyList<SettlementDto>>();

        group.MapGet("/{id:guid}/budget", async (Guid id, int? year, int? month, IClock clock, ISharedBudgetService service, CancellationToken ct) =>
            (await service.GetAsync(id, year ?? clock.UtcNow.Year, month ?? clock.UtcNow.Month, ct)).ToHttpResult()).WithName("GetSharedBudget");
        group.MapPost("/{id:guid}/budget", async (Guid id, SetSharedBudgetRequest request, ISharedBudgetService service, CancellationToken ct) =>
            (await service.SetAsync(id, request, ct)).ToHttpResult()).WithName("SetSharedBudget");
        group.MapGet("/{id:guid}/goals", async (Guid id, ISharedGoalService service, CancellationToken ct) =>
            (await service.ListAsync(id, ct)).ToHttpResult()).WithName("ListSharedGoals");
        group.MapPost("/{id:guid}/goals", async (Guid id, CreateSharedGoalRequest request, ISharedGoalService service, CancellationToken ct) =>
            (await service.CreateAsync(id, request, ct)).ToHttpResult(value => Results.Created($"/v1/workspaces/{id}/goals/{value.Id}", value)))
            .WithName("CreateSharedGoal");
        group.MapPost("/{id:guid}/goals/{goalId:guid}/contribute", async (Guid id, Guid goalId, ContributeGoalRequest request,
            ISharedGoalService service, CancellationToken ct) =>
            (await service.ContributeAsync(id, goalId, request, ct)).ToHttpResult()).WithName("ContributeSharedGoal");
        group.MapGet("/{id:guid}/calendar", async (Guid id, DateOnly? from, DateOnly? to, IClock clock, ISharedCalendarService service, CancellationToken ct) =>
        {
            var start = from ?? DateOnly.FromDateTime(clock.UtcNow);
            var end = to ?? (start.DayNumber <= DateOnly.MaxValue.DayNumber - 30 ? start.AddDays(30) : DateOnly.MaxValue);
            return (await service.GetAsync(id, start, end, ct)).ToHttpResult();
        }).WithName("GetSharedCalendar");
        group.MapPost("/{id:guid}/calendar/events", async (Guid id, CreateSharedFinancialEventRequest request,
            ISharedCalendarService service, CancellationToken ct) =>
            (await service.CreateAsync(id, request, ct)).ToHttpResult(value => Results.Created($"/v1/workspaces/{id}/calendar/events/{value.Id}", value)))
            .WithName("CreateSharedFinancialEvent");
        group.MapGet("/{id:guid}/reports", async (Guid id, int? year, int? month, IClock clock, IWorkspaceReportService service, CancellationToken ct) =>
            (await service.GetAsync(id, year ?? clock.UtcNow.Year, month ?? clock.UtcNow.Month, ct)).ToHttpResult()).WithName("GetWorkspaceMonthlyReport");
        return group;
    }
}
