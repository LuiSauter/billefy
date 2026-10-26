using Messaging.Application.Abstractions;
using Messaging.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Messaging.Infrastructure.Repositories;

internal sealed class WhatsAppLinkRepository(MessagingDbContext context) : IWhatsAppLinkRepository
{
    public Task<WhatsAppLink?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return context.Links.FirstOrDefaultAsync(l => l.UserId == userId, cancellationToken);
    }

    public Task<WhatsAppLink?> GetByPhoneNumberAsync(string phoneNumber, CancellationToken cancellationToken = default)
    {
        var clean = WhatsAppLink.NormalizePhoneNumber(phoneNumber);
        // Disabling query filter for webhook lookup by incoming phone number
        return context.Links
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(l => l.PhoneNumber == clean, cancellationToken);
    }

    public async Task AddAsync(WhatsAppLink link, CancellationToken cancellationToken = default)
    {
        await context.Links.AddAsync(link, cancellationToken);
    }

    public Task UpdateAsync(WhatsAppLink link, CancellationToken cancellationToken = default)
    {
        context.Links.Update(link);
        return Task.CompletedTask;
    }
}
