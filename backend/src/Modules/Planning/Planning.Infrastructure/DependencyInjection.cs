using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Planning.Application.Abstractions;
using Planning.Application.Services;
using Planning.Contracts;
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
        services.AddScoped<IInvestmentRepository, InvestmentRepository>();
        services.AddScoped<IDistributionPlanRepository, DistributionPlanRepository>();
        services.AddScoped<IPlanningUnitOfWork, PlanningUnitOfWork>();

        // Application Services (Cohesive Facade for Driving Adapters)
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<IGoalService, GoalService>();
        services.AddScoped<IInvestmentService, InvestmentService>();
        services.AddScoped<IDistributionPlanService, DistributionPlanService>();
        services.AddScoped<IFinancialHealthService, FinancialHealthService>();
        services.AddScoped<IIncomeDistributionService, IncomeDistributionService>();
        services.AddScoped<IPlanningFinancialDataExport, PlanningFinancialDataExport>();
        services.AddScoped<IPlanningFinancialDataReset, PlanningFinancialDataReset>();

        return services;
    }
}
