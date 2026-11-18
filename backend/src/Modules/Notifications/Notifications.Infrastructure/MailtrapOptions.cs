namespace Notifications.Infrastructure;

public sealed record MailtrapOptions
{
    public string ServiceUrl { get; init; } = string.Empty;
    public string FromEmail { get; init; } = string.Empty;
    public string SecretKey { get; init; } = string.Empty;
    public string FromName { get; init; } = "Billefy";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ServiceUrl) &&
        !string.IsNullOrWhiteSpace(FromEmail) &&
        !string.IsNullOrWhiteSpace(SecretKey);
}
