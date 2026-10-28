using Identity.Application.Abstractions;
using Identity.Application.Services;
using Identity.Contracts;
using Identity.Infrastructure.Repositories;
using Identity.Infrastructure.Tokens;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Identity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PostgreSQL");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddDbContext<IdentityDbContext>(options =>
                options.UseNpgsql(connectionString, npgsql =>
                    npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "identity")));
        }

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IIdentityUnitOfWork, IdentityUnitOfWork>();

        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddScoped<IIdentityModule, IdentityService>();

        return services;
    }
}
