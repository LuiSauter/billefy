namespace Identity.Contracts;

public sealed record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    string TokenType,
    UserDto User);

public sealed record UserDto(
    Guid Id,
    string Email,
    string FullName,
    string? PictureUrl,
    string PreferredCurrency,
    DateTime CreatedAt,
    string NumberGroupingConvention,
    int MaximumDecimalPlaces);

public sealed record GoogleLoginRequest(
    string IdToken,
    string? PreferredCurrency = "BOB");

public sealed record UpdatePreferredCurrencyRequest(string PreferredCurrency);

public sealed record UpdateNumberFormatRequest(string NumberGroupingConvention, int MaximumDecimalPlaces);

public sealed record AppleLoginRequest(
    string IdentityToken,
    string? FullName = null,
    string? PreferredCurrency = "BOB");

public sealed record EmailLoginRequest(
    string Email,
    string? FullName = null,
    string? PreferredCurrency = "BOB");

public sealed record RegisterWithPasswordRequest(
    string FullName,
    string Email,
    string Password,
    string? PreferredCurrency = "BOB");

public sealed record LoginWithPasswordRequest(
    string Email,
    string Password);

public sealed record RefreshTokenRequest(
    string RefreshToken);

public sealed record UserDataExportDto(
    UserDto User,
    DateTime ExportedAt,
    string SystemVersion);
