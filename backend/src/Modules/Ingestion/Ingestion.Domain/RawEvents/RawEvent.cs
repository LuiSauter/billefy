using BuildingBlocks.Common;

namespace Ingestion.Domain.RawEvents;

public sealed class RawEvent : Entity
{
    public Guid EventId { get; private init; }
    public string Channel { get; private init; }
    public string? SourceId { get; private init; }
    public string? MaskedText { get; private init; }
    public DateTimeOffset ReceivedAt { get; private init; }
    public DateTimeOffset PurgeAfter { get; private init; }

    private RawEvent() : base()
    {
        Channel = string.Empty;
    }

    private RawEvent(
        Guid id,
        Guid userId,
        Guid eventId,
        string channel,
        string? sourceId,
        string? maskedText,
        DateTimeOffset receivedAt,
        DateTimeOffset purgeAfter)
        : base(id, userId, receivedAt.UtcDateTime)
    {
        if (eventId == Guid.Empty)
            throw new ArgumentException("EventId cannot be empty.", nameof(eventId));

        if (string.IsNullOrWhiteSpace(channel))
            throw new ArgumentException("Channel cannot be empty.", nameof(channel));

        EventId = eventId;
        Channel = channel;
        SourceId = sourceId;
        MaskedText = maskedText;
        ReceivedAt = receivedAt;
        PurgeAfter = purgeAfter;
    }

    public static RawEvent Create(
        Guid userId,
        Guid eventId,
        string channel,
        string? sourceId,
        string? maskedText,
        DateTimeOffset receivedAt)
    {
        var purgeAfter = receivedAt.AddDays(30);
        return new RawEvent(
            Guid.NewGuid(),
            userId,
            eventId,
            channel,
            sourceId,
            maskedText,
            receivedAt,
            purgeAfter);
    }
}
