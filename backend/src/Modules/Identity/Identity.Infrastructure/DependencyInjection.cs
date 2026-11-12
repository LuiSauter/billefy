using Identity.Application.Abstractions;
using Identity.Application.Services;
using Identity.Contracts;
using Identity.Infrastructure.Options;
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
                options.UseNpgsql(connectionString));
        }

        // Google OAuth Options
        var googleClientId = configuration["Google:ClientId"]
            ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID")
            ?? "";
        var googleClientSecret = configuration["Google:ClientSecret"]
            ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET")
            ?? "";
        var aspnetEnv = configuration["ASPNETCORE_ENVIRONMENT"]
            ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? "Development";
        var allowDevTokens = string.Equals(aspnetEnv, "Development", StringComparison.OrdinalIgnoreCase)
            || string.Equals(aspnetEnv, "Testing", StringComparison.OrdinalIgnoreCase);

        services.AddSingleton(new GoogleAuthOptions
        {
            ClientId = googleClientId,
            ClientSecret = googleClientSecret,
            AllowDevPlainEmailTokens = allowDevTokens
        });
        services.AddSingleton(new GoogleAuthValidationOptions(googleClientId, allowDevTokens));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IIdentityUnitOfWork, IdentityUnitOfWork>();

        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IIdentityModule, IdentityService>();

        return services;
    }
}
