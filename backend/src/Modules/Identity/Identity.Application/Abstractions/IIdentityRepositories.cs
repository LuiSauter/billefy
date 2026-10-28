using Identity.Domain.Entities;

namespace Identity.Application.Abstractions;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task AddAsync(User user, CancellationToken ct = default);
    void Update(User user);
}

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken ct = default);
    Task AddAsync(RefreshToken refreshToken, CancellationToken ct = default);
    Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default);
}

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    int AccessTokenExpirationSeconds { get; }
}

public interface IIdentityUnitOfWork
{
    Task<int> CommitAsync(CancellationToken ct = default);
}
