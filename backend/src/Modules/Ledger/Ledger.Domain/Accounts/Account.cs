using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;

namespace Ledger.Domain.Accounts;

public sealed class Account : Entity
{
    public string Name { get; private set; }
    public AccountType Type { get; private set; }
    public Currency Currency { get; private set; }
    public Money InitialBalance { get; private set; }
    public bool IsArchived { get; private set; }
    public string? IconKey { get; private set; }
    public string? ColorKey { get; private set; }

    // Required by EF Core
    private Account() : base()
    {
        Name = null!;
        Currency = null!;
    }

    private Account(Guid id, Guid userId, string name, AccountType type, Currency currency, Money initialBalance, DateTime createdAt, string? iconKey = null, string? colorKey = null)
        : base(id, userId, createdAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentNullException.ThrowIfNull(currency);

        if (initialBalance.Currency != currency && initialBalance.Currency.Code != currency.Code)
        {
            throw new ArgumentException("Initial balance currency must match account currency.", nameof(initialBalance));
        }

        Name = name.Trim();
        Type = type;
        Currency = currency;
        InitialBalance = initialBalance;
        IsArchived = false;
        IconKey = string.IsNullOrWhiteSpace(iconKey) ? null : iconKey.Trim();
        ColorKey = string.IsNullOrWhiteSpace(colorKey) ? null : colorKey.Trim();
    }

    public static Account Create(Guid userId, string name, AccountType type, Currency currency, Money? initialBalance, DateTime createdAt, string? iconKey = null, string? colorKey = null)
    {
        var balance = initialBalance ?? Money.Zero(currency);
        return new Account(Guid.NewGuid(), userId, name, type, currency, balance, createdAt, iconKey, colorKey);
    }

    public void UpdateName(string newName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(newName);
        Name = newName.Trim();
    }

    public void UpdateVisuals(string? iconKey, string? colorKey)
    {
        IconKey = string.IsNullOrWhiteSpace(iconKey) ? null : iconKey.Trim();
        ColorKey = string.IsNullOrWhiteSpace(colorKey) ? null : colorKey.Trim();
    }

    public void Archive()
    {
        IsArchived = true;
    }

    public void Unarchive()
    {
        IsArchived = false;
    }
}
