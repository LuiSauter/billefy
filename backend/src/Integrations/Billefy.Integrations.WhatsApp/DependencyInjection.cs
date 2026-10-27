using Billefy.Integrations.WhatsApp.Devhooh;
using Billefy.Integrations.WhatsApp.MetaOfficial;
using Messaging.Domain.Ports;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Billefy.Integrations.WhatsApp;

public static class DependencyInjection
{
    public static IServiceCollection AddWhatsAppIntegration(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var provider = configuration["WhatsApp:Provider"]?.Trim().ToLowerInvariant();

        switch (provider)
        {
            case "devhooh":
                var devhoohOptions = new DevhoohOptions
                {
                    BaseUrl = configuration["WhatsApp:Devhooh:BaseUrl"] ?? "https://api-whp.devhooh.com",
                    ApiKey = configuration["WhatsApp:Devhooh:ApiKey"] ?? string.Empty
                };
                services.AddSingleton(devhoohOptions);
                services.AddHttpClient<IMessagingGateway, DevhoohWhatsAppGateway>();
                break;

            case "meta":
                var metaOptions = new MetaOfficialOptions
                {
                    ApiVersion = configuration["WhatsApp:Meta:ApiVersion"] ?? "v21.0",
                    PhoneNumberId = configuration["WhatsApp:Meta:PhoneNumberId"] ?? string.Empty,
                    AccessToken = configuration["WhatsApp:Meta:AccessToken"] ?? string.Empty
                };
                services.AddSingleton(metaOptions);
                services.AddHttpClient<IMessagingGateway, MetaOfficialWhatsAppGateway>();
                break;
        }

        return services;
    }
}
