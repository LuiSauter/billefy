using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Notifications.Application.Abstractions;

namespace Notifications.Infrastructure;

public sealed class MailtrapEmailGateway(
    HttpClient httpClient,
    MailtrapOptions options,
    ILogger<MailtrapEmailGateway> logger) : IEmailGateway
{
    private sealed record MailtrapAddress([property: JsonPropertyName("email")] string Email, [property: JsonPropertyName("name")] string? Name = null);

    private sealed record MailtrapSendRequest(
        [property: JsonPropertyName("from")] MailtrapAddress From,
        [property: JsonPropertyName("to")] MailtrapAddress[] To,
        [property: JsonPropertyName("subject")] string Subject,
        [property: JsonPropertyName("html")] string Html,
        [property: JsonPropertyName("category")] string Category);

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        if (!options.IsConfigured)
        {
            logger.LogWarning("Mailtrap configuration is incomplete. Email not sent.");
            return false;
        }

        var payload = new MailtrapSendRequest(
            new MailtrapAddress(options.FromEmail, options.FromName),
            [new MailtrapAddress(toEmail)],
            subject,
            body,
            "application");

        using var request = new HttpRequestMessage(HttpMethod.Post, options.ServiceUrl)
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.SecretKey);

        try
        {
            var response = await httpClient.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                logger.LogWarning("Mailtrap API responded with status {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email via Mailtrap gateway.");
            return false;
        }
    }
}
