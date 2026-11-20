using Microsoft.Extensions.DependencyInjection;
using Workspaces.Application.Services;

namespace Workspaces.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddWorkspacesApplication(this IServiceCollection services)
    {
        services.AddScoped<WorkspaceAccess>();
        services.AddScoped<IWorkspaceService, WorkspaceService>();
        services.AddScoped<IWorkspaceInvitationLinkService, WorkspaceInvitationLinkService>();
        services.AddScoped<IWorkspaceExpenseService, WorkspaceExpenseService>();
        services.AddScoped<IWorkspaceIncomeService, WorkspaceIncomeService>();
        services.AddScoped<IWorkspaceBalanceService, WorkspaceBalanceService>();
        services.AddScoped<ISharedBudgetService, SharedBudgetService>();
        services.AddScoped<ISharedGoalService, SharedGoalService>();
        services.AddScoped<ISharedCalendarService, SharedCalendarService>();
        services.AddScoped<IWorkspaceReportService, WorkspaceReportService>();
        services.AddScoped<IWorkspaceDashboardService, WorkspaceDashboardService>();
        return services;
    }
}
