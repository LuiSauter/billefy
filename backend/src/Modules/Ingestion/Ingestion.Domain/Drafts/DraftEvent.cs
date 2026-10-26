namespace Ingestion.Domain.Drafts;

public sealed class DraftEvent
{
    public Guid DraftId { get; private init; }
    public Guid EventId { get; private init; }
    public DateTime LinkedAt { get; private init; }

    private DraftEvent()
    {
    }

    public DraftEvent(Guid draftId, Guid eventId, DateTime linkedAt)
    {
        if (draftId == Guid.Empty)
            throw new ArgumentException("DraftId cannot be empty.", nameof(draftId));

        if (eventId == Guid.Empty)
            throw new ArgumentException("EventId cannot be empty.", nameof(eventId));

        DraftId = draftId;
        EventId = eventId;
        LinkedAt = linkedAt;
    }
}
