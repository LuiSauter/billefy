using BuildingBlocks.Common;

namespace Identity.Contracts;

public interface IIdentityModule
{
    Task<Result<AuthResponseDto>> LoginWithEmailAsync(EmailLoginRequest request, CancellationToken ct = default);
    Task<Result<AuthResponseDto>> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default);
    Task<Result<AuthResponseDto>> LoginWithAppleAsync(AppleLoginRequest request, CancellationToken ct = default);
    Task<Result<AuthResponseDto>> RefreshTokenAsync(string refreshToken, CancellationToken ct = default);
    Task<Result<UserDto>> GetCurrentUserAsync(Guid userId, CancellationToken ct = default);
    Task<Result> LogoutAsync(string refreshToken, CancellationToken ct = default);
    Task<Result> RequestAccountDeletionAsync(Guid userId, CancellationToken ct = default);
    Task<Result<UserDataExportDto>> ExportUserDataAsync(Guid userId, CancellationToken ct = default);
}
