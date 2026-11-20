namespace Messaging.Domain.Entities;

public enum WhatsAppLinkStatus
{
    Pending = 1,
    Active = 2,
    Unlinked = 3
}

public enum WhatsAppMessageDirection
{
    Inbound = 1,
    Outbound = 2
}
