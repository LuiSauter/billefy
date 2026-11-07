using BuildingBlocks.Common;

namespace Ingestion.Domain.FinancialSources;

public sealed class BinanceCredential : Entity
{
    public string ApiKey { get; private set; }
    public string EncryptedApiSecret { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime? LastSyncedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private BinanceCredential() : base()
    {
        ApiKey = string.Empty;
        EncryptedApiSecret = string.Empty;
    }

    public BinanceCredential(
        Guid id,
        Guid userId,
        string apiKey,
        string encryptedApiSecret,
        DateTime createdAt)
        : base(id, userId, createdAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(apiKey);
        ArgumentException.ThrowIfNullOrWhiteSpace(encryptedApiSecret);

        ApiKey = apiKey.Trim();
        EncryptedApiSecret = encryptedApiSecret.Trim();
        IsActive = true;
        UpdatedAt = createdAt;
    }

    public static BinanceCredential Create(
        Guid userId,
        string apiKey,
        string encryptedApiSecret,
        DateTime createdAt)
    {
        return new BinanceCredential(
            Guid.NewGuid(),
            userId,
            apiKey,
            encryptedApiSecret,
            createdAt);
    }

    public void UpdateCredentials(string apiKey, string encryptedApiSecret, DateTime at)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(apiKey);
        ArgumentException.ThrowIfNullOrWhiteSpace(encryptedApiSecret);

        ApiKey = apiKey.Trim();
        EncryptedApiSecret = encryptedApiSecret.Trim();
        IsActive = true;
        UpdatedAt = at;
    }

    public void RecordSync(DateTime at)
    {
        LastSyncedAt = at;
        UpdatedAt = at;
    }

    public void Deactivate(DateTime at)
    {
        IsActive = false;
        UpdatedAt = at;
    }
}
