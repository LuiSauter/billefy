using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Planning.Application.Abstractions;
using Planning.Application.Services;
using Planning.Infrastructure.Repositories;

namespace Planning.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddPlanningModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PostgreSQL");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddDbContext<PlanningDbContext>(options =>
                options.UseNpgsql(connectionString));
        }

        // Repositories & Unit of Work
        services.AddScoped<IBudgetRepository, BudgetRepository>();
        services.AddScoped<IGoalRepository, GoalRepository>();
        services.AddScoped<IPlanningUnitOfWork, PlanningUnitOfWork>();

        // Application Services (Cohesive Facade for Driving Adapters)
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<IGoalService, GoalService>();
        services.AddScoped<IFinancialHealthService, FinancialHealthService>();

        return services;
    }
}
