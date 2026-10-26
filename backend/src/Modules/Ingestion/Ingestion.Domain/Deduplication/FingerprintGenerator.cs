using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Ingestion.Domain.Drafts;

namespace Ingestion.Domain.Deduplication;

public static class FingerprintGenerator
{
    public const int TimeBucketSeconds = 300; // 5 minutes

    public static string Generate(
        Guid userId,
        decimal amount,
        string currency,
        DraftDirection direction,
        DateTime estimatedDate,
        string? reference)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("UserId cannot be empty.", nameof(userId));

        if (string.IsNullOrWhiteSpace(currency))
            throw new ArgumentException("Currency cannot be empty.", nameof(currency));

        var cleanRef = reference?.Trim();
        string discriminator;

        if (!string.IsNullOrEmpty(cleanRef))
        {
            discriminator = $"REF:{cleanRef.ToUpperInvariant()}";
        }
        else
        {
            var utcEstimated = estimatedDate.Kind == DateTimeKind.Utc ? estimatedDate : DateTime.SpecifyKind(estimatedDate, DateTimeKind.Utc);
            var bucket = new DateTimeOffset(utcEstimated).ToUnixTimeSeconds() / TimeBucketSeconds;
            discriminator = $"BUCKET:{bucket}";
        }

        var payload = string.Format(
            CultureInfo.InvariantCulture,
            "{0:D}|{1:0.000000}|{2}|{3}|{4}",
            userId,
            amount,
            currency.Trim().ToUpperInvariant(),
            direction,
            discriminator);

        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexStringLower(hashBytes);
    }
}
