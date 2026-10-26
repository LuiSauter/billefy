using BuildingBlocks.Common;

namespace Lending.Domain.Entities;

public sealed class Counterparty : Entity
{
    public string Name { get; private set; }
    public string? Notes { get; private set; }

    private Counterparty() : base()
    {
        Name = string.Empty;
    }

    public Counterparty(Guid id, Guid userId, string name, string? notes, DateTime createdAt)
        : base(id, userId, createdAt)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Counterparty name cannot be empty.", nameof(name));

        Name = name.Trim();
        Notes = notes?.Trim();
    }

    public static Counterparty Create(Guid userId, string name, string? notes, DateTime createdAt) =>
        new(Guid.NewGuid(), userId, name, notes, createdAt);

    public void Update(string name, string? notes)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Counterparty name cannot be empty.", nameof(name));

        Name = name.Trim();
        Notes = notes?.Trim();
    }
}
