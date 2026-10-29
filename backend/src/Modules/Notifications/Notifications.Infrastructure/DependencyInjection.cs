using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Notifications.Application.Abstractions;
using Notifications.Application.Services;
using Notifications.Contracts;
using Notifications.Infrastructure.Repositories;

namespace Notifications.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddNotificationsModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PostgreSQL");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddDbContext<NotificationsDbContext>(options =>
                options.UseNpgsql(connectionString));
        }

        services.AddScoped<IDeviceTokenRepository, DeviceTokenRepository>();
        services.AddScoped<INotificationLogRepository, NotificationLogRepository>();
        services.AddScoped<INotificationsUnitOfWork, NotificationsUnitOfWork>();

        services.AddSingleton<IPushGateway, SimulatedPushGateway>();
        services.AddSingleton<IEmailGateway, SimulatedEmailGateway>();
        services.AddScoped<INotificationsModule, NotificationsService>();

        return services;
    }
}
