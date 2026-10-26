using Lending.Application.Abstractions;
using Lending.Application.Services;
using Lending.Contracts;
using Lending.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Lending.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddLendingModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PostgreSQL");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddDbContext<LendingDbContext>(options =>
                options.UseNpgsql(connectionString));
        }

        // Repositories & Unit of Work
        services.AddScoped<ILoanRepository, LoanRepository>();
        services.AddScoped<ICounterpartyRepository, CounterpartyRepository>();
        services.AddScoped<ILendingUnitOfWork, LendingUnitOfWork>();

        // Application Services (Cohesive Facade for Driving Adapters)
        services.AddScoped<ILoanSimulationService, LoanSimulationService>();
        services.AddScoped<ILoanService, LoanService>();
        services.AddScoped<ILendingModule, LendingModule>();

        return services;
    }
}
