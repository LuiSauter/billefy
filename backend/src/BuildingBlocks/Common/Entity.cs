namespace BuildingBlocks.Common;

public abstract class Entity
{
    public Guid Id { get; protected init; }
    public Guid UserId { get; protected init; }
    public DateTime CreatedAt { get; protected init; }

    protected Entity()
    {
        Id = Guid.NewGuid();
    }

    protected Entity(Guid id, Guid userId, DateTime createdAt)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        UserId = userId == Guid.Empty ? throw new ArgumentException("UserId cannot be empty.", nameof(userId)) : userId;
        CreatedAt = createdAt;
    }
}
