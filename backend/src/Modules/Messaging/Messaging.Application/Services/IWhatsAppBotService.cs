using BuildingBlocks.Common;
using Messaging.Contracts;

namespace Messaging.Application.Services;

public interface IWhatsAppBotService
{
    Task<Result<LinkWhatsAppResponse>> LinkPhoneNumberAsync(
        LinkWhatsAppRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<WhatsAppWebhookResponse>> ProcessInboundWebhookAsync(
        WhatsAppWebhookRequest request,
        CancellationToken cancellationToken = default);
}
