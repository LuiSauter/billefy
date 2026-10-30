using System.Text.Json;
using BuildingBlocks.Common;

namespace Planning.Domain.Investments;

public sealed record InvestmentValuePoint(DateTime At, decimal Value);

public sealed class Investment : Entity
{
    private const int MaxHistoryPoints = 100;

    public string Name { get; private set; }
    public string Kind { get; private set; }
    public string IconKey { get; private set; }
    public string ColorKey { get; private set; }
    public string Currency { get; private set; }
    public decimal Quantity { get; private set; }
    public decimal InitialValue { get; private set; }
    public decimal CurrentValue { get; private set; }
    public string HistoryJson { get; private set; }

    // Required by EF Core
    private Investment() : base()
    {
        Name = null!;
        Kind = null!;
        IconKey = null!;
        ColorKey = null!;
        Currency = null!;
        HistoryJson = "[]";
    }

    private Investment(
        Guid userId,
        string name,
        string kind,
        string iconKey,
        string colorKey,
        string currency,
        decimal quantity,
        decimal currentValue,
        DateTime createdAt)
        : base(Guid.NewGuid(), userId, createdAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(currency);
        if (quantity <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be strictly positive.");
        if (currentValue <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(currentValue), "Current value must be strictly positive.");

        Name = name.Trim();
        Kind = string.IsNullOrWhiteSpace(kind) ? "other" : kind.Trim().ToLowerInvariant();
        IconKey = string.IsNullOrWhiteSpace(iconKey) ? "sparkles" : iconKey.Trim();
        ColorKey = string.IsNullOrWhiteSpace(colorKey) ? "blue" : colorKey.Trim();
        Currency = currency.Trim().ToUpperInvariant();
        Quantity = quantity;
        InitialValue = currentValue;
        CurrentValue = currentValue;
        HistoryJson = Serialize([new InvestmentValuePoint(createdAt, currentValue)]);
    }

    public static Investment Create(
        Guid userId,
        string name,
        string kind,
        string iconKey,
        string colorKey,
        string currency,
        decimal quantity,
        decimal currentValue,
        DateTime createdAt) =>
        new(userId, name, kind, iconKey, colorKey, currency, quantity, currentValue, createdAt);

    /// <summary>Records a new valuation; variation is always derived from InitialValue and history.</summary>
    public void UpdateValue(decimal newValue, decimal? quantity, DateTime at)
    {
        if (newValue <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(newValue), "Current value must be strictly positive.");
        if (quantity.HasValue && quantity.Value <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be strictly positive.");

        var history = GetHistory();
        history.Add(new InvestmentValuePoint(at, newValue));
        if (history.Count > MaxHistoryPoints)
        {
            history = history.Skip(history.Count - MaxHistoryPoints).ToList();
        }

        CurrentValue = newValue;
        if (quantity.HasValue) Quantity = quantity.Value;
        HistoryJson = Serialize(history);
    }

    public decimal? VariationPct() =>
        InitialValue <= decimal.Zero ? null : Math.Round((CurrentValue - InitialValue) / InitialValue * 100m, 2);

    public List<InvestmentValuePoint> GetHistory()
    {
        try
        {
            return JsonSerializer.Deserialize<List<InvestmentValuePoint>>(HistoryJson) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string Serialize(IEnumerable<InvestmentValuePoint> points) => JsonSerializer.Serialize(points);
}
