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
        var provider = (configuration["WhatsApp:Provider"]
            ?? Environment.GetEnvironmentVariable("WHATSAPP_PROVIDER")
            ?? "Simulated").Trim().ToLowerInvariant();

        switch (provider)
        {
            case "devhooh":
                var devhoohOptions = new DevhoohOptions
                {
                    BaseUrl = configuration["WhatsApp:Devhooh:BaseUrl"]
                        ?? Environment.GetEnvironmentVariable("WHATSAPP_DEVHOOH_BASEURL")
                        ?? "https://api-whp.devhooh.com",
                    ApiKey = configuration["WhatsApp:Devhooh:ApiKey"]
                        ?? Environment.GetEnvironmentVariable("WHATSAPP_DEVHOOH_APIKEY")
                        ?? string.Empty
                };
                services.AddSingleton(devhoohOptions);
                services.AddHttpClient<IMessagingGateway, DevhoohWhatsAppGateway>();
                break;

            case "meta":
                var metaOptions = new MetaOfficialOptions
                {
                    BaseUrl = configuration["WhatsApp:Meta:BaseUrl"]
                        ?? Environment.GetEnvironmentVariable("WHATSAPP_META_BASEURL")
                        ?? "https://graph.facebook.com",
                    ApiVersion = configuration["WhatsApp:Meta:ApiVersion"]
                        ?? Environment.GetEnvironmentVariable("WHATSAPP_META_APIVERSION")
                        ?? "v21.0",
                    PhoneNumberId = configuration["WhatsApp:Meta:PhoneNumberId"]
                        ?? Environment.GetEnvironmentVariable("WHATSAPP_META_PHONENUMBERID")
                        ?? string.Empty,
                    AccessToken = configuration["WhatsApp:Meta:AccessToken"]
                        ?? Environment.GetEnvironmentVariable("WHATSAPP_META_ACCESSTOKEN")
                        ?? string.Empty
                };
                services.AddSingleton(metaOptions);
                services.AddHttpClient<IMessagingGateway, MetaOfficialWhatsAppGateway>();
                break;
        }

        return services;
    }
}
