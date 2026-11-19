using System.Text.Json;
using BuildingBlocks.Common;

namespace Planning.Domain.Investments;

public sealed record InvestmentValuePoint(DateTime At, decimal Value);

public sealed class Investment : Entity
{
    private const int MaxHistoryPoints = 100;

    public string Name { get; private set; }
    public string? Ticker { get; private set; }
    public string Kind { get; private set; }
    public string IconKey { get; private set; }
    public string ColorKey { get; private set; }
    public string Currency { get; private set; }
    public decimal Quantity { get; private set; }
    public decimal InitialValue { get; private set; }
    public decimal CurrentValue { get; private set; }
    // Null means legacy acquisition cost is not established; current valuation is not evidence of cost.
    public decimal? CostBasis { get; private set; }
    public Guid ConcurrencyStamp { get; private set; }
    public string HistoryJson { get; private set; }
    public DateTime? ArchivedAt { get; private set; }

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
        DateTime createdAt,
        string? ticker = null)
        : base(Guid.NewGuid(), userId, createdAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(currency);
        if (quantity <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be strictly positive.");
        if (currentValue <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(currentValue), "Current value must be strictly positive.");

        Name = name.Trim();
        Ticker = string.IsNullOrWhiteSpace(ticker) ? null : ticker.Trim().ToUpperInvariant();
        Kind = string.IsNullOrWhiteSpace(kind) ? "other" : kind.Trim().ToLowerInvariant();
        IconKey = string.IsNullOrWhiteSpace(iconKey) ? "sparkles" : iconKey.Trim();
        ColorKey = string.IsNullOrWhiteSpace(colorKey) ? "blue" : colorKey.Trim();
        Currency = currency.Trim().ToUpperInvariant();
        Quantity = quantity;
        InitialValue = currentValue;
        CurrentValue = currentValue;
        CostBasis = currentValue;
        ConcurrencyStamp = Guid.NewGuid();
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
        DateTime createdAt,
        string? ticker = null) =>
        new(userId, name, kind, iconKey, colorKey, currency, quantity, currentValue, createdAt, ticker);

    public void SetTicker(string? ticker) =>
        Ticker = string.IsNullOrWhiteSpace(ticker) ? null : ticker.Trim().ToUpperInvariant();

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
        // Preserve the legacy quantity-edit option, but do not pretend it establishes acquisition cost.
        if (quantity.HasValue && quantity.Value != Quantity)
        {
            Quantity = quantity.Value;
            CostBasis = null;
        }
        ConcurrencyStamp = Guid.NewGuid();
        HistoryJson = Serialize(history);
    }

    public void ApplyPurchase(decimal quantity, decimal acquisitionCost, DateTime at)
    {
        if (quantity <= 0 || acquisitionCost < 0) throw new ArgumentOutOfRangeException(nameof(quantity));
        var cost = CostBasis;
        UpdateValue(CurrentValue + acquisitionCost, Quantity + quantity, at);
        CostBasis = cost.HasValue ? cost.Value + acquisitionCost : null;
    }

    public void MarkCostUnknown()
    {
        CostBasis = null;
        ConcurrencyStamp = Guid.NewGuid();
    }

    public void Archive(DateTime at)
    {
        ArchivedAt ??= at;
        ConcurrencyStamp = Guid.NewGuid();
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
