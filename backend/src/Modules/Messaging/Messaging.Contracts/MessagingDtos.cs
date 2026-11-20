namespace Messaging.Contracts;

public sealed record LinkWhatsAppRequest(string PhoneNumber);

public sealed record LinkWhatsAppResponse(
    Guid LinkId,
    string PhoneNumber,
    string VerificationCode,
    string Status,
    string Instructions);

public sealed record WhatsAppWebhookRequest(
    string ProviderMessageId,
    string FromNumber,
    string MessageText);

public sealed record WhatsAppWebhookResponse(
    bool Processed,
    string? ReplyText,
    string? ActionTaken);
