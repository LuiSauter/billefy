namespace Messaging.Domain.Entities;

public sealed class WhatsAppMessage
{
    public Guid Id { get; private init; }
    public Guid LinkId { get; private init; }
    public string ProviderMessageId { get; private init; }
    public WhatsAppMessageDirection Direction { get; private init; }
    public string Text { get; private init; }
    public Guid? DraftId { get; private set; }
    public DateTime CreatedAt { get; private init; }

    private WhatsAppMessage()
    {
        ProviderMessageId = string.Empty;
        Text = string.Empty;
    }

    public WhatsAppMessage(
        Guid id,
        Guid linkId,
        string providerMessageId,
        WhatsAppMessageDirection direction,
        string text,
        Guid? draftId,
        DateTime createdAt)
    {
        if (string.IsNullOrWhiteSpace(providerMessageId))
            throw new ArgumentException("ProviderMessageId cannot be empty.", nameof(providerMessageId));

        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        LinkId = linkId;
        ProviderMessageId = providerMessageId.Trim();
        Direction = direction;
        Text = text ?? string.Empty;
        DraftId = draftId;
        CreatedAt = createdAt;
    }

    public static WhatsAppMessage CreateInbound(
        Guid linkId,
        string providerMessageId,
        string text,
        DateTime createdAt)
    {
        return new WhatsAppMessage(
            Guid.NewGuid(),
            linkId,
            providerMessageId,
            WhatsAppMessageDirection.Inbound,
            text,
            draftId: null,
            createdAt);
    }

    public static WhatsAppMessage CreateOutbound(
        Guid linkId,
        string providerMessageId,
        string text,
        Guid? draftId,
        DateTime createdAt)
    {
        return new WhatsAppMessage(
            Guid.NewGuid(),
            linkId,
            providerMessageId,
            WhatsAppMessageDirection.Outbound,
            text,
            draftId,
            createdAt);
    }

    public void LinkDraft(Guid draftId)
    {
        DraftId = draftId;
    }
}
