using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Messaging.Domain.Ports;
using Microsoft.Extensions.Logging;

namespace Billefy.Integrations.WhatsApp.MetaOfficial;

public sealed record MetaOfficialOptions
{
    public string ApiVersion { get; init; } = "v21.0";
    public string PhoneNumberId { get; init; } = string.Empty;
    public string AccessToken { get; init; } = string.Empty;
}

public sealed class MetaOfficialWhatsAppGateway(
    HttpClient httpClient,
    MetaOfficialOptions options,
    ILogger<MetaOfficialWhatsAppGateway> logger) : IMessagingGateway
{
    private sealed record MetaMessageText(
        [property: JsonPropertyName("preview_url")] bool PreviewUrl,
        [property: JsonPropertyName("body")] string Body);

    private sealed record MetaSendMessageRequest(
        [property: JsonPropertyName("messaging_product")] string MessagingProduct,
        [property: JsonPropertyName("recipient_type")] string RecipientType,
        [property: JsonPropertyName("to")] string To,
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("text")] MetaMessageText Text);

    public async Task<bool> SendTextMessageAsync(
        string toPhoneNumber,
        string text,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(options.PhoneNumberId) || string.IsNullOrWhiteSpace(options.AccessToken))
        {
            logger.LogWarning("Meta Official WhatsApp credentials are not configured. Message not sent.");
            return false;
        }

        var cleanPhone = toPhoneNumber.Trim().Replace("+", "").Replace(" ", "").Replace("-", "");

        var requestUri = $"https://graph.facebook.com/{options.ApiVersion}/{options.PhoneNumberId}/messages";
        var payload = new MetaSendMessageRequest(
            MessagingProduct: "whatsapp",
            RecipientType: "individual",
            To: cleanPhone,
            Type: "text",
            Text: new MetaMessageText(PreviewUrl: false, Body: text));

        using var request = new HttpRequestMessage(HttpMethod.Post, requestUri)
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.AccessToken);

        try
        {
            var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning("Meta WhatsApp Cloud API responded with status {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send WhatsApp message via Meta Official Cloud API.");
            return false;
        }
    }
}
