using BuildingBlocks.Common;
using BuildingBlocks.Security;
using Fx.Contracts;
using Ingestion.Application.Deduplication;
using Ingestion.Application.Parsing;
using Ingestion.Application.Services;
using Ingestion.Contracts;
using Ledger.Application.Accounts.Services;
using Messaging.Application.Abstractions;
using Messaging.Contracts;
using Messaging.Domain.Entities;
using Messaging.Domain.Ports;

namespace Messaging.Application.Services;

public sealed class WhatsAppBotService(
    IWhatsAppLinkRepository linkRepository,
    IWhatsAppMessageRepository messageRepository,
    IMessagingGateway messagingGateway,
    IMessagingUnitOfWork unitOfWork,
    IFinancialTextParser parser,
    IDeduplicationService deduplicationService,
    IDraftService draftService,
    IAccountService accountService,
    IRateSnapshotProvider rateProvider,
    ICurrentUserContext userContext) : IWhatsAppBotService
{
    public async Task<Result<LinkWhatsAppResponse>> LinkPhoneNumberAsync(
        LinkWhatsAppRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<LinkWhatsAppResponse>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return Result.Failure<LinkWhatsAppResponse>(
                Error.Validation("WhatsApp.InvalidPhone", "Phone number is required."));
        }

        var userId = userContext.UserId!.Value;
        var normalizedPhone = WhatsAppLink.NormalizePhoneNumber(request.PhoneNumber);
        var verificationCode = Random.Shared.Next(100000, 999999).ToString();

        var existing = await linkRepository.GetByUserIdAsync(userId, cancellationToken);
        WhatsAppLink link;

        if (existing is null)
        {
            link = WhatsAppLink.Create(userId, normalizedPhone, verificationCode, DateTime.UtcNow);
            await linkRepository.AddAsync(link, cancellationToken);
        }
        else
        {
            link = new WhatsAppLink(
                existing.Id,
                userId,
                normalizedPhone,
                WhatsAppLinkStatus.Pending,
                verificationCode,
                existing.CreatedAt);
            await linkRepository.UpdateAsync(link, cancellationToken);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(new LinkWhatsAppResponse(
            link.Id,
            link.PhoneNumber,
            link.VerificationCode,
            link.Status.ToString(),
            $"Envía el código «{verificationCode}» o la palabra «CONFIRMAR» por WhatsApp al número de Billefy para activar tu cuenta."));
    }

    public async Task<Result<WhatsAppWebhookResponse>> ProcessInboundWebhookAsync(
        WhatsAppWebhookRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ProviderMessageId))
            {
                return Result.Failure<WhatsAppWebhookResponse>(
                    Error.Validation("Webhook.InvalidMessageId", "ProviderMessageId is required."));
            }

            // 1. Webhook Idempotency Check on provider_message_id (Section 6.3 Architecture)
            var existingMsg = await messageRepository.GetByProviderMessageIdAsync(
                request.ProviderMessageId,
                cancellationToken);

            if (existingMsg is not null)
            {
                return Result.Success(new WhatsAppWebhookResponse(
                    Processed: false,
                    ReplyText: null,
                    ActionTaken: "DuplicateIgnored"));
            }

            var normalizedPhone = WhatsAppLink.NormalizePhoneNumber(request.FromNumber);
            var link = await linkRepository.GetByPhoneNumberAsync(normalizedPhone, cancellationToken);

            string replyText;
            string actionTaken;
            Guid? draftId = null;

            if (link is null)
            {
                replyText = "Tu número no está vinculado a Billefy. Inicia sesión en la aplicación y vincula tu número para registrar gastos y consultar saldos.";
                actionTaken = "UnlinkedNotice";
            }
            else
            {
                // Record inbound message
                var inbound = WhatsAppMessage.CreateInbound(
                    link.Id,
                    request.ProviderMessageId,
                    request.MessageText,
                    DateTime.UtcNow);
                await messageRepository.AddAsync(inbound, cancellationToken);

                var cleanText = request.MessageText.Trim();
                var upperText = cleanText.ToUpperInvariant();

                if (link.Status == WhatsAppLinkStatus.Pending)
                {
                    // Check verification
                    if (cleanText.Contains(link.VerificationCode) || upperText.Contains("CONFIRMAR") || upperText.Contains("SI"))
                    {
                        link.Activate(DateTime.UtcNow);
                        await linkRepository.UpdateAsync(link, cancellationToken);
                        replyText = "¡Listo! Tu número ha sido verificado con éxito. Ya puedes registrar gastos escribiendo por ejemplo: «Gasto 50 bs en taxi» o consultar «Saldo».";
                        actionTaken = "LinkActivated";
                    }
                    else
                    {
                        replyText = $"Para activar tu cuenta de Billefy, por favor envía el código de 6 dígitos ({link.VerificationCode}) que generaste en la app.";
                        actionTaken = "PendingVerification";
                    }
                }
                else // Active Link
                {
                    if (upperText == "1" || upperText == "CONFIRMAR")
                    {
                        // Confirm last draft
                        var lastOutbound = await messageRepository.GetLastOutboundWithDraftAsync(link.Id, cancellationToken);
                        if (lastOutbound?.DraftId is not null)
                        {
                            var accountsResult = await accountService.GetAccountsByUserIdAsync(link.UserId, cancellationToken);
                            var targetAccount = accountsResult.IsSuccess && accountsResult.Value.Count > 0
                                ? accountsResult.Value[0].Id
                                : Guid.Empty;

                            if (targetAccount != Guid.Empty)
                            {
                                var confirmResult = await draftService.ConfirmDraftForUserAsync(
                                    link.UserId,
                                    lastOutbound.DraftId.Value,
                                    new ConfirmDraftRequest(targetAccount, null, "Confirmado vía WhatsApp"),
                                    cancellationToken);

                                if (confirmResult.IsSuccess)
                                {
                                    replyText = "✅ Movimiento confirmado y asentado en tu Libro Mayor.";
                                    actionTaken = "DraftConfirmed";
                                }
                                else
                                {
                                    replyText = "No se pudo confirmar el borrador (puede haber sido confirmado o descartado previamente).";
                                    actionTaken = "ConfirmFailed";
                                }
                            }
                            else
                            {
                                replyText = "Debes crear al menos una cuenta en la aplicación para imputar el movimiento.";
                                actionTaken = "NoAccounts";
                            }
                        }
                        else
                        {
                            replyText = "No tienes ningún borrador pendiente de confirmación.";
                            actionTaken = "NoPendingDraft";
                        }
                    }
                    else if (upperText == "2" || upperText == "DESCARTAR" || upperText == "CANCELAR")
                    {
                        // Discard last draft
                        var lastOutbound = await messageRepository.GetLastOutboundWithDraftAsync(link.Id, cancellationToken);
                        if (lastOutbound?.DraftId is not null)
                        {
                            await draftService.DiscardDraftForUserAsync(link.UserId, lastOutbound.DraftId.Value, cancellationToken);
                            replyText = "🗑️ Borrador descartado. La huella ha sido conservada.";
                            actionTaken = "DraftDiscarded";
                        }
                        else
                        {
                            replyText = "No tienes ningún borrador pendiente para descartar.";
                            actionTaken = "NoPendingDraft";
                        }
                    }
                    else if (upperText == "SALDO" || upperText == "BALANCE" || upperText == "CUENTAS")
                    {
                        var accountsResult = await accountService.GetAccountsByUserIdAsync(link.UserId, cancellationToken);
                        if (accountsResult.IsSuccess && accountsResult.Value.Count > 0)
                        {
                            var sb = new System.Text.StringBuilder("💰 Tus Saldos Actuales:\n");
                            foreach (var a in accountsResult.Value)
                            {
                                sb.AppendLine($"• {a.Name}: {a.Balance:F2} {a.Currency}");
                            }
                            replyText = sb.ToString().TrimEnd();
                        }
                        else
                        {
                            replyText = "No tienes cuentas activas registradas en Billefy.";
                        }
                        actionTaken = "BalanceQuery";
                    }
                    else if (upperText.Contains("COTIZACION") || upperText.Contains("COTIZACIÓN") || upperText.Contains("DOLAR") || upperText.Contains("DÓLAR"))
                    {
                        var rateSnapshot = await rateProvider.GetSnapshotAsync("BOB", "USD", link.UserId, cancellationToken);
                        if (rateSnapshot is not null)
                        {
                            replyText = $"💵 Cotización P2P: {rateSnapshot.AppliedRate:F2} BOB/USD (Fuente: {rateSnapshot.RateSource})";
                        }
                        else
                        {
                            replyText = "Cotización no disponible en este momento.";
                        }
                        actionTaken = "RateQuery";
                    }
                    else
                    {
                        // Try parsing financial movement text (e.g. "gasté 50 bs en taxi")
                        var parseResult = parser.Parse(cleanText, DateTime.UtcNow);
                        if (parseResult.Success)
                        {
                            var dedupResult = await deduplicationService.ProcessMovementAsync(
                                link.UserId,
                                Guid.NewGuid(),
                                source: "whatsapp",
                                parseResult.Amount,
                                parseResult.Currency,
                                parseResult.Direction,
                                DateTime.UtcNow,
                                parseResult.Reference,
                                parseResult.Confidence,
                                cancellationToken: cancellationToken);

                            draftId = dedupResult.DraftId;
                            var dirLabel = parseResult.Direction == Ingestion.Domain.Drafts.DraftDirection.Income ? "Ingreso" : "Gasto";
                            replyText = $"📝 {dirLabel} de {parseResult.Amount:F2} {parseResult.Currency} detectado.\nResponde 1 para confirmar o 2 para descartar.";
                            actionTaken = "DraftCreated";
                        }
                        else
                        {
                            replyText = "No logré interpretar el mensaje. Puedes escribir por ejemplo:\n• «Gasto 50 bs en taxi»\n• «Saldo»\n• «Dólar»";
                            actionTaken = "HelpText";
                        }
                    }
                }
            }

            // 2. Outbound message & dispatch through IMessagingGateway (Rules 21 & 23)
            var outboundMsgId = $"OUT-{Guid.NewGuid().ToString()[..8]}";
            if (link is not null)
            {
                var outbound = WhatsAppMessage.CreateOutbound(
                    link.Id,
                    outboundMsgId,
                    replyText,
                    draftId,
                    DateTime.UtcNow);
                await messageRepository.AddAsync(outbound, cancellationToken);
            }

            await unitOfWork.SaveChangesAsync(cancellationToken);

            // Send via gateway port
            await messagingGateway.SendTextMessageAsync(request.FromNumber, replyText, cancellationToken);

            return Result.Success(new WhatsAppWebhookResponse(
                Processed: true,
                ReplyText: replyText,
                ActionTaken: actionTaken));
        }
        catch (Exception ex)
        {
            return Result.Failure<WhatsAppWebhookResponse>(
                Error.Failure("Webhook.Exception", ex.ToString()));
        }
    }
}
