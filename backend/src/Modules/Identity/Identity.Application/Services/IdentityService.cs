using System.Security.Cryptography;
using System.Text;
using BuildingBlocks.Common;
using BuildingBlocks.Time;
using Identity.Application.Abstractions;
using Identity.Contracts;
using Identity.Domain.Entities;
using Fx.Contracts;

namespace Identity.Application.Services;

public sealed class IdentityService : IIdentityModule
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ITokenService _tokenService;
    private readonly IIdentityUnitOfWork _unitOfWork;
    private readonly IClock _clock;
    private readonly GoogleAuthValidationOptions _googleOptions;
    private readonly ICurrencyCatalog _currencyCatalog;
    private readonly IPasswordHasher _passwordHasher;

    public IdentityService(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        ITokenService tokenService,
        IIdentityUnitOfWork unitOfWork,
        IClock clock,
        ICurrencyCatalog currencyCatalog,
        GoogleAuthValidationOptions? googleOptions = null,
        IPasswordHasher? passwordHasher = null)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _currencyCatalog = currencyCatalog;
        _googleOptions = googleOptions ?? new GoogleAuthValidationOptions(string.Empty, AllowDevPlainEmailTokens: false);
        _passwordHasher = passwordHasher ?? new PasswordHasher();
    }

    public async Task<Result<AuthResponseDto>> RegisterWithPasswordAsync(
        RegisterWithPasswordRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return Result.Failure<AuthResponseDto>(Error.Validation("Identity.InvalidFullName", "El nombre completo no puede estar vacío."));
        }

        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            return Result.Failure<AuthResponseDto>(Error.Validation("Identity.InvalidEmail", "El correo electrónico no es válido."));
        }

        var passwordValidation = PasswordValidator.Validate(request.Password);
        if (passwordValidation.IsFailure)
        {
            return Result.Failure<AuthResponseDto>(passwordValidation.Error);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var existing = await _userRepository.GetByEmailAsync(normalizedEmail, ct);
        if (existing is not null && !existing.IsDeleted)
        {
            return Result.Failure<AuthResponseDto>(Error.Conflict("Identity.EmailAlreadyRegistered", "El correo electrónico ya está registrado."));
        }

        var preferredCurrency = !string.IsNullOrWhiteSpace(request.PreferredCurrency) &&
            await _currencyCatalog.IsActiveAsync(request.PreferredCurrency.Trim().ToUpperInvariant(), ct)
            ? request.PreferredCurrency.Trim().ToUpperInvariant()
            : "BOB";

        var passwordHash = _passwordHasher.HashPassword(request.Password);

        User user;
        if (existing is not null && existing.IsDeleted)
        {
            existing.UpdateProfile(request.FullName, null);
            existing.SetPasswordHash(passwordHash);
            existing.UpdatePreferredCurrency(preferredCurrency);
            existing.RecordLogin(_clock.UtcNow);
            _userRepository.Update(existing);
            user = existing;
        }
        else
        {
            var createResult = User.CreateWithPassword(
                normalizedEmail,
                request.FullName.Trim(),
                passwordHash,
                preferredCurrency,
                _clock.UtcNow);

            if (createResult.IsFailure)
            {
                return Result.Failure<AuthResponseDto>(createResult.Error);
            }

            user = createResult.Value;
            await _userRepository.AddAsync(user, ct);
        }

        await _unitOfWork.CommitAsync(ct);
        return await GenerateAuthResponseAsync(user, ct);
    }

    public async Task<Result<AuthResponseDto>> LoginWithPasswordAsync(
        LoginWithPasswordRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Result.Failure<AuthResponseDto>(Error.Unauthorized("Identity.InvalidCredentials", "Credenciales inválidas."));
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail, ct);
        if (user is null || user.IsDeleted || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            return Result.Failure<AuthResponseDto>(Error.Unauthorized("Identity.InvalidCredentials", "Credenciales inválidas."));
        }

        if (!_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Result.Failure<AuthResponseDto>(Error.Unauthorized("Identity.InvalidCredentials", "Credenciales inválidas."));
        }

        user.RecordLogin(_clock.UtcNow);
        _userRepository.Update(user);
        await _unitOfWork.CommitAsync(ct);

        return await GenerateAuthResponseAsync(user, ct);
    }

    public async Task<Result<AuthResponseDto>> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
        {
            return Result.Failure<AuthResponseDto>(Error.Validation("Identity.InvalidToken", "El ID Token de Google no puede estar vacío."));
        }

        string email = string.Empty;
        string fullName = string.Empty;
        string? pictureUrl = null;

        var rawToken = request.IdToken.Trim();

        // Plain email tokens are ONLY permitted in Development or Testing environments
        if (rawToken.Contains('@') && rawToken.Split('.').Length < 3)
        {
            if (!_googleOptions.AllowDevPlainEmailTokens)
            {
                return Result.Failure<AuthResponseDto>(
                    Error.Unauthorized("Identity.InvalidGoogleToken", "El formato de token de desarrollo no está permitido en producción."));
            }

            email = rawToken.ToLowerInvariant();
            fullName = email.Split('@')[0];
        }
        else
        {
            try
            {
                var parts = rawToken.Split('.');
                if (parts.Length != 3 || string.IsNullOrWhiteSpace(parts[2]))
                {
                    return Result.Failure<AuthResponseDto>(
                        Error.Unauthorized("Identity.InvalidGoogleToken", "El ID Token de Google no tiene una estructura JWT válida."));
                }

                var payloadJson = Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
                using var doc = System.Text.Json.JsonDocument.Parse(payloadJson);
                var root = doc.RootElement;

                // Validate issuer (iss)
                if (root.TryGetProperty("iss", out var issProp))
                {
                    var iss = issProp.GetString();
                    if (iss != "https://accounts.google.com" && iss != "accounts.google.com")
                    {
                        return Result.Failure<AuthResponseDto>(
                            Error.Unauthorized("Identity.InvalidGoogleIssuer", "El emisor (iss) del token no corresponde a Google."));
                    }
                }
                else if (!_googleOptions.AllowDevPlainEmailTokens)
                {
                    return Result.Failure<AuthResponseDto>(
                        Error.Unauthorized("Identity.MissingGoogleIssuer", "El token de Google no contiene el reclamo de emisor (iss)."));
                }

                // Validate audience (aud) when Google ClientId is configured
                if (!string.IsNullOrWhiteSpace(_googleOptions.ClientId) &&
                    !_googleOptions.ClientId.StartsWith("TU_GOOGLE_CLIENT_ID", StringComparison.OrdinalIgnoreCase))
                {
                    var aud = root.TryGetProperty("aud", out var audProp) ? audProp.GetString() : null;
                    if (!string.Equals(aud, _googleOptions.ClientId, StringComparison.Ordinal))
                    {
                        return Result.Failure<AuthResponseDto>(
                            Error.Unauthorized("Identity.InvalidGoogleAudience", "La audiencia (aud) del token de Google no es válida."));
                    }
                }

                // Validate expiration (exp)
                if (root.TryGetProperty("exp", out var expProp) && expProp.TryGetInt64(out var expUnix))
                {
                    var expiresAt = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
                    if (expiresAt <= _clock.UtcNow)
                    {
                        return Result.Failure<AuthResponseDto>(
                            Error.Unauthorized("Identity.ExpiredGoogleToken", "El ID Token de Google ha expirado."));
                    }
                }
                else if (!_googleOptions.AllowDevPlainEmailTokens)
                {
                    return Result.Failure<AuthResponseDto>(
                        Error.Unauthorized("Identity.MissingGoogleExpiration", "El token de Google no contiene fecha de expiración (exp)."));
                }

                // Validate email_verified if present
                if (root.TryGetProperty("email_verified", out var verifiedProp) &&
                    (verifiedProp.ValueKind == System.Text.Json.JsonValueKind.False ||
                     (verifiedProp.ValueKind == System.Text.Json.JsonValueKind.String &&
                      string.Equals(verifiedProp.GetString(), "false", StringComparison.OrdinalIgnoreCase))))
                {
                    return Result.Failure<AuthResponseDto>(
                        Error.Unauthorized("Identity.UnverifiedGoogleEmail", "El correo electrónico de la cuenta de Google no está verificado."));
                }

                email = root.TryGetProperty("email", out var emailProp) ? emailProp.GetString() ?? "" : "";
                fullName = root.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "";
                pictureUrl = root.TryGetProperty("picture", out var picProp) ? picProp.GetString() : null;
            }
            catch
            {
                return Result.Failure<AuthResponseDto>(
                    Error.Unauthorized("Identity.InvalidGoogleToken", "El ID Token de Google es inválido o está corrupto."));
            }
        }

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return Result.Failure<AuthResponseDto>(Error.Validation("Identity.InvalidGooglePayload", "No se pudo extraer el correo electrónico del token de Google."));
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail, ct);

        if (user is null)
        {
            var preferredCurrency = (request.PreferredCurrency ?? "BOB").Trim().ToUpperInvariant();
            if (!await _currencyCatalog.IsActiveAsync(preferredCurrency, ct))
            {
                return Result.Failure<AuthResponseDto>(Error.Validation(
                    "Identity.UnsupportedCurrency", "La moneda preferida no está disponible."));
            }

            var createResult = User.Create(
                normalizedEmail,
                string.IsNullOrWhiteSpace(fullName) ? normalizedEmail.Split('@')[0] : fullName,
                pictureUrl,
                preferredCurrency,
                _clock.UtcNow);

            if (createResult.IsFailure)
            {
                return Result.Failure<AuthResponseDto>(createResult.Error);
            }

            user = createResult.Value;
            await _userRepository.AddAsync(user, ct);
        }
        else
        {
            user.RecordLogin(_clock.UtcNow);
            if (user.IsDeleted)
            {
                user.RestoreAccount();
            }
            _userRepository.Update(user);
        }

        return await GenerateAuthResponseAsync(user, ct);
    }

    public async Task<Result<AuthResponseDto>> RefreshTokenAsync(string refreshTokenStr, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenStr))
        {
            return Result.Failure<AuthResponseDto>(Error.Validation("Identity.InvalidRefreshToken", "El refresh token no es válido."));
        }

        var tokenHash = ComputeTokenHash(refreshTokenStr);
        var token = await _refreshTokenRepository.GetByTokenAsync(tokenHash, ct)
                    ?? await _refreshTokenRepository.GetByTokenAsync(refreshTokenStr, ct);

        if (token is null)
        {
            return Result.Failure<AuthResponseDto>(Error.Unauthorized("Identity.ExpiredRefreshToken", "El refresh token ha expirado o fue revocado."));
        }

        // Reuse detection (SECURITY_AND_PRIVACY.md Section 3): if a revoked token is presented again, revoke all active sessions for the user
        if (token.IsRevoked)
        {
            await _refreshTokenRepository.RevokeAllForUserAsync(token.UserId, ct);
            await _unitOfWork.CommitAsync(ct);
            return Result.Failure<AuthResponseDto>(Error.Unauthorized("Identity.RefreshTokenReused", "Se detectó reutilización de un refresh token revocado. Todas las sesiones han sido cerradas por seguridad."));
        }

        if (!token.IsActive(_clock.UtcNow))
        {
            return Result.Failure<AuthResponseDto>(Error.Unauthorized("Identity.ExpiredRefreshToken", "El refresh token ha expirado o fue revocado."));
        }

        var user = await _userRepository.GetByIdAsync(token.UserId, ct);
        if (user is null || user.IsDeleted)
        {
            return Result.Failure<AuthResponseDto>(Error.NotFound("Identity.UserNotFound", "Usuario no encontrado o dado de baja."));
        }

        // Rotate Refresh Token (store only SHA-256 hash in DB)
        var newRefreshToken = _tokenService.GenerateRefreshToken();
        var newRefreshTokenHash = ComputeTokenHash(newRefreshToken);
        token.Revoke(newRefreshTokenHash, _clock.UtcNow);

        var newExpiresAt = _clock.UtcNow.AddDays(30);
        var rotatedToken = RefreshToken.Create(user.Id, newRefreshTokenHash, newExpiresAt, _clock.UtcNow);
        await _refreshTokenRepository.AddAsync(rotatedToken, ct);
        await _unitOfWork.CommitAsync(ct);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var userDto = new UserDto(user.Id, user.Email, user.FullName, user.PictureUrl, user.PreferredCurrency, user.CreatedAt,
            user.NumberGroupingConvention, user.MaximumDecimalPlaces);

        return Result.Success(new AuthResponseDto(
            accessToken,
            newRefreshToken,
            _tokenService.AccessTokenExpirationSeconds,
            "Bearer",
            userDto));
    }

    public async Task<Result<UserDto>> GetCurrentUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct);
        if (user is null)
        {
            return Result.Failure<UserDto>(Error.NotFound("Identity.UserNotFound", "Usuario no encontrado."));
        }

        return Result.Success(new UserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.PictureUrl,
            user.PreferredCurrency,
            user.CreatedAt,
            user.NumberGroupingConvention,
            user.MaximumDecimalPlaces));
    }

    public async Task<Result<UserDto>> UpdatePreferredCurrencyAsync(
        Guid userId, string preferredCurrency, CancellationToken ct = default)
    {
        var normalizedCurrency = preferredCurrency?.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(normalizedCurrency) ||
            !await _currencyCatalog.IsActiveAsync(normalizedCurrency, ct))
        {
            return Result.Failure<UserDto>(Error.Validation(
                "Identity.UnsupportedCurrency", "La moneda preferida no está disponible."));
        }

        var user = await _userRepository.GetByIdAsync(userId, ct);
        if (user is null || user.IsDeleted)
        {
            return Result.Failure<UserDto>(Error.NotFound("Identity.UserNotFound", "Usuario no encontrado."));
        }

        if (!string.Equals(user.PreferredCurrency, normalizedCurrency, StringComparison.Ordinal))
        {
            user.UpdatePreferredCurrency(normalizedCurrency);
            _userRepository.Update(user);
            await _unitOfWork.CommitAsync(ct);
        }

        return Result.Success(new UserDto(
            user.Id, user.Email, user.FullName, user.PictureUrl, user.PreferredCurrency, user.CreatedAt,
            user.NumberGroupingConvention, user.MaximumDecimalPlaces));
    }

    public async Task<Result<UserDto>> UpdateNumberFormatPreferencesAsync(
        Guid userId, string groupingConvention, int maximumDecimalPlaces, CancellationToken ct = default)
    {
        if (groupingConvention is not ("es-BO" or "en-US") || maximumDecimalPlaces is < 0 or > 6)
        {
            return Result.Failure<UserDto>(Error.Validation(
                "Identity.InvalidNumberFormat", "La convención debe ser es-BO o en-US y los decimales deben estar entre 0 y 6."));
        }

        var user = await _userRepository.GetByIdAsync(userId, ct);
        if (user is null || user.IsDeleted)
        {
            return Result.Failure<UserDto>(Error.NotFound("Identity.UserNotFound", "Usuario no encontrado."));
        }

        user.UpdateNumberFormatPreferences(groupingConvention, maximumDecimalPlaces);
        _userRepository.Update(user);
        await _unitOfWork.CommitAsync(ct);

        return Result.Success(new UserDto(user.Id, user.Email, user.FullName, user.PictureUrl,
            user.PreferredCurrency, user.CreatedAt, user.NumberGroupingConvention, user.MaximumDecimalPlaces));
    }

    public async Task<Result> LogoutAsync(string refreshTokenStr, Guid? userId = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenStr))
        {
            return Result.Success();
        }

        var tokenHash = ComputeTokenHash(refreshTokenStr);
        var token = await _refreshTokenRepository.GetByTokenAsync(tokenHash, ct)
                    ?? await _refreshTokenRepository.GetByTokenAsync(refreshTokenStr, ct);

        if (token is not null && token.IsActive(_clock.UtcNow))
        {
            if (userId.HasValue && token.UserId != userId.Value)
            {
                return Result.Failure(Error.Unauthorized("Identity.Forbidden", "No tienes permiso para revocar esta sesión."));
            }

            token.Revoke(null, _clock.UtcNow);
            await _unitOfWork.CommitAsync(ct);
        }

        return Result.Success();
    }

    public async Task<Result> RequestAccountDeletionAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct);
        if (user is null)
        {
            return Result.Failure(Error.NotFound("Identity.UserNotFound", "Usuario no encontrado."));
        }

        user.RequestDeletion(_clock.UtcNow);
        _userRepository.Update(user);
        await _refreshTokenRepository.RevokeAllForUserAsync(userId, ct);
        await _unitOfWork.CommitAsync(ct);

        return Result.Success();
    }

    public async Task<Result<UserDataExportDto>> ExportUserDataAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct);
        if (user is null)
        {
            return Result.Failure<UserDataExportDto>(Error.NotFound("Identity.UserNotFound", "Usuario no encontrado."));
        }

        var userDto = new UserDto(user.Id, user.Email, user.FullName, user.PictureUrl, user.PreferredCurrency,
            user.CreatedAt, user.NumberGroupingConvention, user.MaximumDecimalPlaces);
        var export = new UserDataExportDto(userDto, _clock.UtcNow, "Billefy v1.0.0");
        return Result.Success(export);
    }

    private async Task<Result<AuthResponseDto>> GenerateAuthResponseAsync(User user, CancellationToken ct)
    {
        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshTokenStr = _tokenService.GenerateRefreshToken();
        var refreshTokenHash = ComputeTokenHash(refreshTokenStr);
        var expiresAt = _clock.UtcNow.AddDays(30);

        var refreshToken = RefreshToken.Create(user.Id, refreshTokenHash, expiresAt, _clock.UtcNow);
        await _refreshTokenRepository.AddAsync(refreshToken, ct);
        await _unitOfWork.CommitAsync(ct);

        var userDto = new UserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.PictureUrl,
            user.PreferredCurrency,
            user.CreatedAt,
            user.NumberGroupingConvention,
            user.MaximumDecimalPlaces);

        return Result.Success(new AuthResponseDto(
            accessToken,
            refreshTokenStr,
            _tokenService.AccessTokenExpirationSeconds,
            "Bearer",
            userDto));
    }

    private static string ComputeTokenHash(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken.Trim()));
        return Convert.ToHexStringLower(bytes);
    }

    private static byte[] Base64UrlDecode(string input)
    {
        var output = input.Replace('-', '+').Replace('_', '/');
        switch (output.Length % 4)
        {
            case 0: break;
            case 2: output += "=="; break;
            case 3: output += "="; break;
            default: throw new FormatException("Cadena base64url inválida.");
        }
        return Convert.FromBase64String(output);
    }
}
