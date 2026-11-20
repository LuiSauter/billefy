using System.Security.Cryptography;
using System.Text;
using BuildingBlocks.Security;
using FluentAssertions;
using Xunit;

namespace BuildingBlocks.Tests;

public class EncryptionServiceTests
{
    [Fact]
    public void Encrypt_And_Decrypt_Should_Preserve_Original_PlainText()
    {
        // 32-byte key for AES-256
        var key = new byte[32];
        RandomNumberGenerator.Fill(key);
        var service = new AesGcmEncryptionService(key);

        var original = "my-super-secret-binance-api-secret-1234567890";
        var encrypted = service.Encrypt(original);

        encrypted.Should().NotBeNullOrWhiteSpace();
        encrypted.Should().NotBe(original);

        var decrypted = service.Decrypt(encrypted);
        decrypted.Should().Be(original);
    }

    [Fact]
    public void Encrypt_Same_PlainText_Twice_Produces_Different_CipherTexts_Due_To_Random_Nonce()
    {
        var key = new byte[32];
        RandomNumberGenerator.Fill(key);
        var service = new AesGcmEncryptionService(key);

        var plainText = "same-secret";
        var enc1 = service.Encrypt(plainText);
        var enc2 = service.Encrypt(plainText);

        enc1.Should().NotBe(enc2);
        service.Decrypt(enc1).Should().Be(plainText);
        service.Decrypt(enc2).Should().Be(plainText);
    }

    [Fact]
    public void Decrypt_Tampered_Ciphertext_Throws_CryptographicException()
    {
        var key = new byte[32];
        RandomNumberGenerator.Fill(key);
        var service = new AesGcmEncryptionService(key);

        var encrypted = service.Encrypt("important-secret");
        var bytes = Convert.FromBase64String(encrypted);
        // Tamper with one byte in the ciphertext payload
        bytes[^1] ^= 0xFF;
        var tampered = Convert.ToBase64String(bytes);

        Action act = () => service.Decrypt(tampered);
        act.Should().Throw<CryptographicException>();
    }
}
