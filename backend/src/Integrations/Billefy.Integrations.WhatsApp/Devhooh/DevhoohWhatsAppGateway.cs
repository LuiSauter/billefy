using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Messaging.Domain.Ports;
using Microsoft.Extensions.Logging;

namespace Billefy.Integrations.WhatsApp.Devhooh;

public sealed record DevhoohOptions
{
    public string BaseUrl { get; init; } = "https://api-whp.devhooh.com";
    public string ApiKey { get; init; } = string.Empty;
}

public sealed class DevhoohWhatsAppGateway(
    HttpClient httpClient,
    DevhoohOptions options,
    ILogger<DevhoohWhatsAppGateway> logger) : IMessagingGateway
{
    private sealed record DevhoohSendTextRequest(
        [property: JsonPropertyName("to")] string To,
        [property: JsonPropertyName("message")] string Message);

    public async Task<bool> SendTextMessageAsync(
        string toPhoneNumber,
        string text,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(options.ApiKey))
        {
            logger.LogWarning("Devhooh API key is not configured. Message not sent.");
            return false;
        }

        var cleanPhone = toPhoneNumber.Trim().Replace("+", "").Replace(" ", "").Replace("-", "");

        var requestUri = $"{options.BaseUrl.TrimEnd('/')}/api/v1/messages/send-text";
        var payload = new DevhoohSendTextRequest(cleanPhone, text);

        using var request = new HttpRequestMessage(HttpMethod.Post, requestUri)
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);

        try
        {
            var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning("Devhooh API responded with status {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send WhatsApp message via Devhooh gateway.");
            return false;
        }
    }
}
