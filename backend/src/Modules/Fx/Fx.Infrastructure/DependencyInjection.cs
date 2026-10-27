using Billefy.Integrations.Fx.DolarApi;
using Fx.Application.Abstractions;
using Fx.Application.Services;
using Fx.Contracts;
using Fx.Domain.Rates;
using Fx.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Fx.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddFxModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PostgreSQL");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddDbContext<FxDbContext>(options =>
                options.UseNpgsql(connectionString));
        }

        services.AddScoped<IExchangeRateRepository, ExchangeRateRepository>();

        // Register DolarApi Options from configuration/env
        var rateSourceUrl = configuration["Fx:RateSourceUrl"]
            ?? Environment.GetEnvironmentVariable("FX_RATESOURCEURL")
            ?? "https://bo.dolarapi.com/v1/dolares/binance";
        services.AddSingleton(new DolarApiOptions { RateSourceUrl = rateSourceUrl });

        // Register DolarApi HTTP client with 10s timeout
        services.AddHttpClient<IRateSource, DolarApiRateSource>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        // Register Contract service
        services.AddScoped<IRateSnapshotProvider, RateSnapshotService>();

        return services;
    }
}
