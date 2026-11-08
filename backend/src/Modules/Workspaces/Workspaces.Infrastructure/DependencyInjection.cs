using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Workspaces.Application.Abstractions;

namespace Workspaces.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddWorkspacesInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PostgreSQL");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddDbContext<WorkspacesDbContext>(options => options.UseNpgsql(connectionString));
        }

        services.AddScoped<IWorkspaceRepository, WorkspaceRepository>();
        services.AddScoped<IWorkspaceInvitationLinkRepository, WorkspaceInvitationLinkRepository>();
        return services;
    }
}
