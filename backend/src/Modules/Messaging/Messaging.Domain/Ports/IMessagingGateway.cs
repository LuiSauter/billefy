namespace Messaging.Domain.Ports;

public interface IMessagingGateway
{
    Task<bool> SendTextMessageAsync(string toPhoneNumber, string text, CancellationToken cancellationToken = default);
}
