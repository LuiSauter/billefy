using Messaging.Application.Abstractions;

namespace Messaging.Infrastructure.Repositories;

internal sealed class MessagingUnitOfWork(MessagingDbContext context) : IMessagingUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return context.SaveChangesAsync(cancellationToken);
    }
}
