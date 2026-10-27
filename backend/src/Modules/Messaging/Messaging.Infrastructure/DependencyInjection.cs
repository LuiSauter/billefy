using Messaging.Application.Abstractions;
using Messaging.Application.Services;
using Messaging.Domain.Ports;
using Messaging.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Messaging.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddMessagingModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PostgreSQL");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddDbContext<MessagingDbContext>(options =>
                options.UseNpgsql(connectionString));
        }

        // Repositories & Gateway Port
        services.AddScoped<IWhatsAppLinkRepository, WhatsAppLinkRepository>();
        services.AddScoped<IWhatsAppMessageRepository, WhatsAppMessageRepository>();
        services.AddScoped<IMessagingUnitOfWork, MessagingUnitOfWork>();

        if (!services.Any(s => s.ServiceType == typeof(IMessagingGateway)))
        {
            services.AddSingleton<IMessagingGateway, SimulatedMessagingGateway>();
        }

        // Application Services (Cohesive Facade for Driving Adapters)
        services.AddScoped<IWhatsAppBotService, WhatsAppBotService>();

        return services;
    }
}
