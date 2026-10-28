using Microsoft.EntityFrameworkCore;
using Notifications.Application.Abstractions;
using Notifications.Domain.Entities;

namespace Notifications.Infrastructure.Repositories;

public sealed class DeviceTokenRepository : IDeviceTokenRepository
{
    private readonly NotificationsDbContext _context;

    public DeviceTokenRepository(NotificationsDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<DeviceToken>> GetActiveByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await _context.DeviceTokens
            .Where(dt => dt.UserId == userId && dt.IsActive)
            .ToListAsync(ct);
    }

    public async Task<DeviceToken?> GetByTokenAsync(string token, CancellationToken ct = default)
    {
        return await _context.DeviceTokens.FirstOrDefaultAsync(dt => dt.Token == token, ct);
    }

    public async Task AddAsync(DeviceToken token, CancellationToken ct = default)
    {
        await _context.DeviceTokens.AddAsync(token, ct);
    }

    public void Update(DeviceToken token)
    {
        _context.DeviceTokens.Update(token);
    }
}

public sealed class NotificationLogRepository : INotificationLogRepository
{
    private readonly NotificationsDbContext _context;

    public NotificationLogRepository(NotificationsDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<NotificationLog>> GetByUserIdAsync(Guid userId, int limit = 50, CancellationToken ct = default)
    {
        return await _context.NotificationLogs
            .Where(nl => nl.UserId == userId)
            .OrderByDescending(nl => nl.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task AddAsync(NotificationLog log, CancellationToken ct = default)
    {
        await _context.NotificationLogs.AddAsync(log, ct);
    }
}

public sealed class NotificationsUnitOfWork : INotificationsUnitOfWork
{
    private readonly NotificationsDbContext _context;

    public NotificationsUnitOfWork(NotificationsDbContext context)
    {
        _context = context;
    }

    public async Task<int> CommitAsync(CancellationToken ct = default)
    {
        return await _context.SaveChangesAsync(ct);
    }
}

public sealed class SimulatedPushGateway : IPushGateway
{
    public Task<bool> SendPushAsync(string token, string title, string body, Dictionary<string, string>? data = null, CancellationToken ct = default)
    {
        // In local development / test, push delivers successfully to device token
        return Task.FromResult(true);
    }
}

public sealed class SimulatedEmailGateway : IEmailGateway
{
    public Task<bool> SendEmailAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        // In local development / test, email delivers successfully
        return Task.FromResult(true);
    }
}
