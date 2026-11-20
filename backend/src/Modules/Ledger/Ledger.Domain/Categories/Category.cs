using BuildingBlocks.Common;

namespace Ledger.Domain.Categories;

public sealed class Category : Entity
{
    public string Name { get; private set; }
    public Guid? ParentCategoryId { get; private set; }
    public string? Icon { get; private set; }

    // Required by EF Core
    private Category() : base()
    {
        Name = null!;
    }

    private Category(Guid id, Guid userId, string name, Guid? parentCategoryId, string? icon, DateTime createdAt)
        : base(id, userId, createdAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        Name = name.Trim();
        ParentCategoryId = parentCategoryId;
        Icon = icon?.Trim();
    }

    public static Category Create(Guid userId, string name, Guid? parentCategoryId, string? icon, DateTime createdAt, Guid? id = null) =>
        new(id.HasValue && id.Value != Guid.Empty ? id.Value : Guid.NewGuid(), userId, name, parentCategoryId, icon, createdAt);

    public void Rename(string newName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(newName);
        Name = newName.Trim();
    }
}
