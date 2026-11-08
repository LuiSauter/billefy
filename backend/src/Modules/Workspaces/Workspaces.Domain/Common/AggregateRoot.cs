namespace Workspaces.Domain.Common;

// Workspace aggregates are shared resources, not owned by Entity.UserId.
public abstract class AggregateRoot
{
    public Guid Id { get; }

    protected AggregateRoot() { }

    protected AggregateRoot(Guid id)
    {
        Id = DomainGuard.Id(id, nameof(id));
    }
}
