using BuildingBlocks.Common;

namespace Identity.Contracts;

public interface IIdentityModule
{
    Task<Result<AuthResponseDto>> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default);
    Task<Result<AuthResponseDto>> RefreshTokenAsync(string refreshToken, CancellationToken ct = default);
    Task<Result<UserDto>> GetCurrentUserAsync(Guid userId, CancellationToken ct = default);
    Task<Result<UserDto>> UpdatePreferredCurrencyAsync(Guid userId, string preferredCurrency, CancellationToken ct = default);
    Task<Result<UserDto>> UpdateNumberFormatPreferencesAsync(Guid userId, string groupingConvention, int maximumDecimalPlaces, CancellationToken ct = default);
    Task<Result> LogoutAsync(string refreshToken, Guid? userId = null, CancellationToken ct = default);
    Task<Result> RequestAccountDeletionAsync(Guid userId, CancellationToken ct = default);
    Task<Result<UserDataExportDto>> ExportUserDataAsync(Guid userId, CancellationToken ct = default);
}
