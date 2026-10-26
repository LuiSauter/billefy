using Api.Common;
using Messaging.Application.Services;
using Messaging.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class MessagingEndpoints
{
    public static RouteGroupBuilder MapMessagingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/messaging/whatsapp")
            .WithTags("Messaging");

        group.MapPost("/link", async (
            [FromBody] LinkWhatsAppRequest request,
            IWhatsAppBotService service,
            CancellationToken ct) =>
        {
            var result = await service.LinkPhoneNumberAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("LinkWhatsAppNumber")
        .WithSummary("Generate verification code to bind WhatsApp phone number with user account (BOT-01).")
        .Produces<LinkWhatsAppResponse>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/webhook", async (
            [FromBody] WhatsAppWebhookRequest request,
            IWhatsAppBotService service,
            CancellationToken ct) =>
        {
            var result = await service.ProcessInboundWebhookAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("WhatsAppInboundWebhook")
        .WithSummary("Webhook endpoint for inbound WhatsApp messages (BOT-02 to BOT-09). Strictly replies to incoming messages.")
        .Produces<WhatsAppWebhookResponse>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest);

        return group;
    }
}
