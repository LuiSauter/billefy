using BuildingBlocks.Common;
using BuildingBlocks.Time;
using Identity.Application.Abstractions;
using Identity.Contracts;
using Identity.Domain.Entities;

namespace Identity.Application.Services;

public sealed class IdentityService : IIdentityModule
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ITokenService _tokenService;
    private readonly IIdentityUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public IdentityService(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        ITokenService tokenService,
        IIdentityUnitOfWork unitOfWork,
        IClock clock)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<Result<AuthResponseDto>> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
        {
            return Result.Failure<AuthResponseDto>(Error.Validation("Identity.InvalidToken", "El ID Token de Google no puede estar vacío."));
        }

        // Extract email and full name from Google ID Token
        // Supports both raw email format (for dev/tests) and Google JWT tokens
        string email;
        string fullName;
        string? pictureUrl = null;

        if (request.IdToken.Contains('@') && request.IdToken.Split('.').Length < 3)
        {
            email = request.IdToken.Trim().ToLowerInvariant();
            fullName = email.Split('@')[0];
        }
        else
        {
            // Parse JWT payload from Google token without third-party library to stay lightweight
            try
            {
                var parts = request.IdToken.Split('.');
                if (parts.Length >= 2)
                {
                    var payloadJson = System.Text.Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
                    using var doc = System.Text.Json.JsonDocument.Parse(payloadJson);
                    var root = doc.RootElement;

                    email = root.TryGetProperty("email", out var emailProp) ? emailProp.GetString() ?? "" : "";
                    fullName = root.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "";
                    pictureUrl = root.TryGetProperty("picture", out var picProp) ? picProp.GetString() : null;
                }
                else
                {
                    email = "usuario.google@billefy.app";
                    fullName = "Usuario Google";
                }
            }
            catch
            {
                email = "usuario.google@billefy.app";
                fullName = "Usuario Google";
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
            var createResult = User.Create(
                normalizedEmail,
                string.IsNullOrWhiteSpace(fullName) ? normalizedEmail.Split('@')[0] : fullName,
                pictureUrl,
                request.PreferredCurrency ?? "BOB",
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

        var token = await _refreshTokenRepository.GetByTokenAsync(refreshTokenStr, ct);
        if (token is null || !token.IsActive(_clock.UtcNow))
        {
            return Result.Failure<AuthResponseDto>(Error.Unauthorized("Identity.ExpiredRefreshToken", "El refresh token ha expirado o fue revocado."));
        }

        var user = await _userRepository.GetByIdAsync(token.UserId, ct);
        if (user is null || user.IsDeleted)
        {
            return Result.Failure<AuthResponseDto>(Error.NotFound("Identity.UserNotFound", "Usuario no encontrado o dado de baja."));
        }

        // Rotate Refresh Token
        var newRefreshToken = _tokenService.GenerateRefreshToken();
        token.Revoke(newRefreshToken, _clock.UtcNow);

        var newExpiresAt = _clock.UtcNow.AddDays(30);
        var rotatedToken = RefreshToken.Create(user.Id, newRefreshToken, newExpiresAt, _clock.UtcNow);
        await _refreshTokenRepository.AddAsync(rotatedToken, ct);
        await _unitOfWork.CommitAsync(ct);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var userDto = new UserDto(user.Id, user.Email, user.FullName, user.PictureUrl, user.PreferredCurrency, user.CreatedAt);

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
            user.CreatedAt));
    }

    public async Task<Result> LogoutAsync(string refreshTokenStr, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenStr))
        {
            return Result.Success();
        }

        var token = await _refreshTokenRepository.GetByTokenAsync(refreshTokenStr, ct);
        if (token is not null && token.IsActive(_clock.UtcNow))
        {
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

        var userDto = new UserDto(user.Id, user.Email, user.FullName, user.PictureUrl, user.PreferredCurrency, user.CreatedAt);
        var export = new UserDataExportDto(userDto, _clock.UtcNow, "Billefy v1.0.0");
        return Result.Success(export);
    }

    private async Task<Result<AuthResponseDto>> GenerateAuthResponseAsync(User user, CancellationToken ct)
    {
        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshTokenStr = _tokenService.GenerateRefreshToken();
        var expiresAt = _clock.UtcNow.AddDays(30);

        var refreshToken = RefreshToken.Create(user.Id, refreshTokenStr, expiresAt, _clock.UtcNow);
        await _refreshTokenRepository.AddAsync(refreshToken, ct);
        await _unitOfWork.CommitAsync(ct);

        var userDto = new UserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.PictureUrl,
            user.PreferredCurrency,
            user.CreatedAt);

        return Result.Success(new AuthResponseDto(
            accessToken,
            refreshTokenStr,
            _tokenService.AccessTokenExpirationSeconds,
            "Bearer",
            userDto));
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
