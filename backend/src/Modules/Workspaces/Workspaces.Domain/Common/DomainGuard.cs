using BuildingBlocks.ValueObjects;

namespace Workspaces.Domain.Common;

internal static class DomainGuard
{
    public static Guid Id(Guid value, string name) => value == Guid.Empty
        ? throw new ArgumentException("Identifier cannot be empty.", name)
        : value;

    public static string Text(string value, string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value, name);
        return value.Trim();
    }

    public static T Defined<T>(T value, string name) where T : struct, Enum => Enum.IsDefined(value)
        ? value
        : throw new ArgumentOutOfRangeException(name, "Unknown enum value.");

    public static Money Amount(Money value, string name, bool allowZero = false)
    {
        if (value.Currency is null || value.Amount < 0m || (!allowZero && value.Amount == 0m))
            throw new ArgumentException("Amount must have a currency and be positive (or zero when allowed).", name);
        return value;
    }

    public static decimal Percentage(decimal value, string name) => value is < 0m or > 100m
        ? throw new ArgumentOutOfRangeException(name, "Percentage must be between 0 and 100.")
        : value;
}
