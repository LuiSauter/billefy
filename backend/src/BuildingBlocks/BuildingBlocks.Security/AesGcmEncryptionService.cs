using System.Security.Cryptography;
using System.Text;

namespace BuildingBlocks.Security;

public sealed class AesGcmEncryptionService : IEncryptionService
{
    private const int NonceSize = 12; // 96 bits recommended for AES-GCM
    private const int TagSize = 16;   // 128 bits
    private readonly byte[] _key;

    public AesGcmEncryptionService(byte[] key)
    {
        if (key is null || key.Length != 32)
            throw new ArgumentException("AES-256-GCM key must be exactly 32 bytes (256 bits).", nameof(key));
        _key = (byte[])key.Clone();
    }

    public AesGcmEncryptionService(string keyOrSecret)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(keyOrSecret);

        // If 64 hex characters or 32-byte base64, parse directly. Else, derive using SHA-256.
        if (keyOrSecret.Length == 64 && IsHexString(keyOrSecret))
        {
            _key = Convert.FromHexString(keyOrSecret);
        }
        else
        {
            try
            {
                var bytes = Convert.FromBase64String(keyOrSecret);
                if (bytes.Length == 32)
                {
                    _key = bytes;
                    return;
                }
            }
            catch (FormatException)
            {
                // Fall through to SHA256 derivation
            }

            // Deterministic 32-byte key derivation using SHA-256
            _key = SHA256.HashData(Encoding.UTF8.GetBytes(keyOrSecret));
        }
    }

    public string Encrypt(string plainText)
    {
        ArgumentNullException.ThrowIfNull(plainText);

        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var nonce = new byte[NonceSize];
        RandomNumberGenerator.Fill(nonce);

        var cipherBytes = new byte[plainBytes.Length];
        var tag = new byte[TagSize];

        using (var aesGcm = new AesGcm(_key, TagSize))
        {
            aesGcm.Encrypt(nonce, plainBytes, cipherBytes, tag);
        }

        // Output format: Nonce (12) + Tag (16) + Ciphertext
        var combined = new byte[NonceSize + TagSize + cipherBytes.Length];
        Buffer.BlockCopy(nonce, 0, combined, 0, NonceSize);
        Buffer.BlockCopy(tag, 0, combined, NonceSize, TagSize);
        Buffer.BlockCopy(cipherBytes, 0, combined, NonceSize + TagSize, cipherBytes.Length);

        return Convert.ToBase64String(combined);
    }

    public string Decrypt(string cipherText)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(cipherText);

        var combined = Convert.FromBase64String(cipherText);
        if (combined.Length < NonceSize + TagSize)
            throw new CryptographicException("Ciphertext payload is truncated or invalid.");

        var nonce = new byte[NonceSize];
        var tag = new byte[TagSize];
        var cipherLength = combined.Length - NonceSize - TagSize;
        var cipherBytes = new byte[cipherLength];

        Buffer.BlockCopy(combined, 0, nonce, 0, NonceSize);
        Buffer.BlockCopy(combined, NonceSize, tag, 0, TagSize);
        Buffer.BlockCopy(combined, NonceSize + TagSize, cipherBytes, 0, cipherLength);

        var plainBytes = new byte[cipherLength];

        using (var aesGcm = new AesGcm(_key, TagSize))
        {
            aesGcm.Decrypt(nonce, cipherBytes, tag, plainBytes);
        }

        return Encoding.UTF8.GetString(plainBytes);
    }

    private static bool IsHexString(string s) =>
        s.All(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));
}
