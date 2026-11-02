using BuildingBlocks.Common;

namespace Identity.Domain.Entities;

public sealed class User : Entity
{
    private User() : base()
    {
    }

    public User(
        Guid id,
        string email,
        string fullName,
        string? pictureUrl,
        string preferredCurrency,
        DateTime createdAt)
        : base(id, id, createdAt)
    {
        Email = email.Trim().ToLowerInvariant();
        FullName = fullName.Trim();
        PictureUrl = pictureUrl;
        PreferredCurrency = string.IsNullOrWhiteSpace(preferredCurrency) ? "BOB" : preferredCurrency.Trim().ToUpperInvariant();
        LastLoginAt = createdAt;
        IsDeleted = false;
    }

    public string Email { get; private set; } = null!;
    public string FullName { get; private set; } = null!;
    public string? PictureUrl { get; private set; }
    public string PreferredCurrency { get; private set; } = "BOB";
    public string NumberGroupingConvention { get; private set; } = "es-BO";
    public int MaximumDecimalPlaces { get; private set; } = 2;
    public DateTime LastLoginAt { get; private set; }
    public bool IsDeleted { get; private set; }
    public DateTime? DeletionRequestedAt { get; private set; }

    public static Result<User> Create(
        string email,
        string fullName,
        string? pictureUrl = null,
        string preferredCurrency = "BOB",
        DateTime? now = null)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return Result.Failure<User>(Error.Validation("Identity.InvalidEmail", "El correo electrónico no es válido."));
        }

        if (string.IsNullOrWhiteSpace(fullName))
        {
            return Result.Failure<User>(Error.Validation("Identity.InvalidFullName", "El nombre completo no puede estar vacío."));
        }

        var id = Guid.NewGuid();
        var user = new User(
            id,
            email,
            fullName,
            pictureUrl,
            preferredCurrency,
            now ?? DateTime.UtcNow);

        return Result.Success(user);
    }

    public void RecordLogin(DateTime now)
    {
        LastLoginAt = now;
    }

    public void UpdateProfile(string fullName, string? pictureUrl)
    {
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            FullName = fullName.Trim();
        }
        PictureUrl = pictureUrl;
    }

    public void UpdatePreferredCurrency(string currency)
    {
        if (!string.IsNullOrWhiteSpace(currency))
        {
            PreferredCurrency = currency.Trim().ToUpperInvariant();
        }
    }

    public bool UpdateNumberFormatPreferences(string groupingConvention, int maximumDecimalPlaces)
    {
        if (groupingConvention is not ("es-BO" or "en-US") || maximumDecimalPlaces is < 0 or > 6)
        {
            return false;
        }

        NumberGroupingConvention = groupingConvention;
        MaximumDecimalPlaces = maximumDecimalPlaces;
        return true;
    }

    public void RequestDeletion(DateTime now)
    {
        IsDeleted = true;
        DeletionRequestedAt = now;
    }

    public void RestoreAccount()
    {
        IsDeleted = false;
        DeletionRequestedAt = null;
    }
}
