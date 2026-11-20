using Messaging.Domain.Entities;

namespace Messaging.Application.Abstractions;

public interface IWhatsAppLinkRepository
{
    Task<WhatsAppLink?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<WhatsAppLink?> GetByPhoneNumberAsync(string phoneNumber, CancellationToken cancellationToken = default);
    Task AddAsync(WhatsAppLink link, CancellationToken cancellationToken = default);
    Task UpdateAsync(WhatsAppLink link, CancellationToken cancellationToken = default);
}

public interface IWhatsAppMessageRepository
{
    Task<WhatsAppMessage?> GetByProviderMessageIdAsync(string providerMessageId, CancellationToken cancellationToken = default);
    Task<WhatsAppMessage?> GetLastOutboundWithDraftAsync(Guid linkId, CancellationToken cancellationToken = default);
    Task AddAsync(WhatsAppMessage message, CancellationToken cancellationToken = default);
}

public interface IMessagingUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
