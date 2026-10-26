using Messaging.Application.Abstractions;
using Messaging.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Messaging.Infrastructure.Repositories;

internal sealed class WhatsAppMessageRepository(MessagingDbContext context) : IWhatsAppMessageRepository
{
    public Task<WhatsAppMessage?> GetByProviderMessageIdAsync(string providerMessageId, CancellationToken cancellationToken = default)
    {
        return context.Messages
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.ProviderMessageId == providerMessageId.Trim(), cancellationToken);
    }

    public Task<WhatsAppMessage?> GetLastOutboundWithDraftAsync(Guid linkId, CancellationToken cancellationToken = default)
    {
        return context.Messages
            .IgnoreQueryFilters()
            .Where(m => m.LinkId == linkId && m.Direction == WhatsAppMessageDirection.Outbound && m.DraftId != null)
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task AddAsync(WhatsAppMessage message, CancellationToken cancellationToken = default)
    {
        await context.Messages.AddAsync(message, cancellationToken);
    }
}
