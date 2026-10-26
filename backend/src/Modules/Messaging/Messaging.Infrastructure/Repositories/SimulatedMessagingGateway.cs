using Messaging.Domain.Ports;

namespace Messaging.Infrastructure.Repositories;

public sealed class SimulatedMessagingGateway : IMessagingGateway
{
    private static readonly List<(string To, string Text, DateTime SentAt)> SentHistory = [];

    public static IReadOnlyList<(string To, string Text, DateTime SentAt)> Outbox => SentHistory.AsReadOnly();

    public Task<bool> SendTextMessageAsync(string toPhoneNumber, string text, CancellationToken cancellationToken = default)
    {
        SentHistory.Add((toPhoneNumber, text, DateTime.UtcNow));
        return Task.FromResult(true);
    }
}
