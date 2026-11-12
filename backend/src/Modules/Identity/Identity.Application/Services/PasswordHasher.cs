using System.Security.Cryptography;
using BuildingBlocks.Common;

namespace Identity.Application.Services;

public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}

public static class PasswordValidator
{
    public const int MinLength = 8;

    public static Result Validate(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < MinLength)
        {
            return Result.Failure(Error.Validation("Identity.WeakPassword", "La contraseña debe tener al menos 8 caracteres."));
        }

        if (!password.Any(char.IsUpper))
        {
            return Result.Failure(Error.Validation("Identity.WeakPassword", "La contraseña debe contener al menos una letra mayúscula."));
        }

        if (!password.Any(char.IsDigit))
        {
            return Result.Failure(Error.Validation("Identity.WeakPassword", "La contraseña debe contener al menos un número."));
        }

        if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
        {
            return Result.Failure(Error.Validation("Identity.WeakPassword", "La contraseña debe contener al menos un símbolo o carácter especial."));
        }

        return Result.Success();
    }
}

public sealed class PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public string HashPassword(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, KeySize);

        return $"v1.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(key)}";
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(passwordHash))
        {
            return false;
        }

        var parts = passwordHash.Split('.');
        if (parts.Length != 3 || parts[0] != "v1")
        {
            return false;
        }

        try
        {
            var salt = Convert.FromBase64String(parts[1]);
            var expectedKey = Convert.FromBase64String(parts[2]);

            if (salt.Length != SaltSize || expectedKey.Length != KeySize)
            {
                return false;
            }

            var actualKey = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, KeySize);
            return CryptographicOperations.FixedTimeEquals(actualKey, expectedKey);
        }
        catch
        {
            return false;
        }
    }
}
