using BuildingBlocks.Common;
using BuildingBlocks.Time;
using Notifications.Application.Abstractions;
using Notifications.Contracts;
using Notifications.Domain.Entities;

namespace Notifications.Application.Services;

public sealed class NotificationsService : INotificationsModule
{
    private readonly IDeviceTokenRepository _deviceTokenRepository;
    private readonly INotificationLogRepository _logRepository;
    private readonly IPushGateway _pushGateway;
    private readonly IEmailGateway _emailGateway;
    private readonly INotificationsUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public NotificationsService(
        IDeviceTokenRepository deviceTokenRepository,
        INotificationLogRepository logRepository,
        IPushGateway pushGateway,
        IEmailGateway emailGateway,
        INotificationsUnitOfWork unitOfWork,
        IClock clock)
    {
        _deviceTokenRepository = deviceTokenRepository;
        _logRepository = logRepository;
        _pushGateway = pushGateway;
        _emailGateway = emailGateway;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<Result<DeviceRegistrationDto>> RegisterDeviceAsync(
        Guid userId,
        RegisterDeviceTokenRequest req,
        CancellationToken ct = default)
    {
        var existing = await _deviceTokenRepository.GetByTokenAsync(req.Token, ct);
        if (existing != null)
        {
            existing.Touch(_clock.UtcNow);
            _deviceTokenRepository.Update(existing);
            await _unitOfWork.CommitAsync(ct);
            return Result.Success(new DeviceRegistrationDto(existing.Id, existing.Platform, existing.CreatedAt));
        }

        var createResult = DeviceToken.Create(userId, req.Token, req.Platform, _clock.UtcNow);
        if (createResult.IsFailure)
        {
            return Result.Failure<DeviceRegistrationDto>(createResult.Error);
        }

        var entity = createResult.Value;
        await _deviceTokenRepository.AddAsync(entity, ct);
        await _unitOfWork.CommitAsync(ct);

        return Result.Success(new DeviceRegistrationDto(entity.Id, entity.Platform, entity.CreatedAt));
    }

    public async Task<Result> SendPushNotificationAsync(
        Guid userId,
        PushNotificationMessage message,
        CancellationToken ct = default)
    {
        var devices = await _deviceTokenRepository.GetActiveByUserIdAsync(userId, ct);
        if (devices.Count == 0)
        {
            // Still log as in-app notification
            var log = NotificationLog.CreateSuccess(
                userId,
                NotificationType.InApp,
                "InApp",
                message.Title,
                message.Body,
                _clock.UtcNow);
            await _logRepository.AddAsync(log, ct);
            await _unitOfWork.CommitAsync(ct);
            return Result.Success();
        }

        foreach (var device in devices)
        {
            var success = await _pushGateway.SendPushAsync(device.Token, message.Title, message.Body, message.Data, ct);
            var log = success
                ? NotificationLog.CreateSuccess(userId, NotificationType.Push, device.Platform, message.Title, message.Body, _clock.UtcNow)
                : NotificationLog.CreateFailed(userId, NotificationType.Push, device.Platform, message.Title, message.Body, "Push gateway refused or failed", _clock.UtcNow);

            await _logRepository.AddAsync(log, ct);
        }

        await _unitOfWork.CommitAsync(ct);
        return Result.Success();
    }

    public async Task<Result> SendEmailNotificationAsync(
        SendEmailRequest request,
        CancellationToken ct = default)
    {
        var success = await _emailGateway.SendEmailAsync(request.ToEmail, request.Subject, request.Body, ct);
        return success
            ? Result.Success()
            : Result.Failure(Error.Failure("Email.SendFailed", "No se pudo entregar el correo electrónico transaccional."));
    }

    public async Task<Result<IReadOnlyList<NotificationLogDto>>> GetNotificationHistoryAsync(
        Guid userId,
        CancellationToken ct = default)
    {
        var logs = await _logRepository.GetByUserIdAsync(userId, 50, ct);
        var dtos = logs.Select(l => new NotificationLogDto(
            l.Id,
            l.Type.ToString(),
            l.Channel,
            l.Title,
            l.Body,
            l.CreatedAt,
            l.Status)).ToList();

        return Result.Success<IReadOnlyList<NotificationLogDto>>(dtos);
    }

    public async Task<Result> NotifyBudgetThresholdExceededAsync(
        Guid userId,
        string category,
        decimal spent,
        decimal limit,
        decimal threshold,
        CancellationToken ct = default)
    {
        var percentage = limit > 0 ? (spent / limit) * 100 : 0;
        var isCritical = percentage >= 100;

        var title = isCritical
            ? $"🚨 Tope de Presupuesto Alcanzado: {category}"
            : $"⚠️ Alerta al {threshold * 100:0}%: {category}";

        var body = isCritical
            ? $"Has consumido Bs {spent:N2} de tu límite de Bs {limit:N2}. Los gastos futuros activarán bloqueo preventivo."
            : $"Has alcanzado el {percentage:0.#}% (Bs {spent:N2} / Bs {limit:N2}). Quedan Bs {Math.Max(0, limit - spent):N2} para el resto del mes.";

        return await SendPushNotificationAsync(userId, new PushNotificationMessage(title, body), ct);
    }

    public async Task<Result> NotifyLoanInstallmentDueAsync(
        Guid userId,
        string counterparty,
        decimal amount,
        string currency,
        DateTime dueDate,
        CancellationToken ct = default)
    {
        var title = $"📅 Vencimiento Próximo: Cuota de {counterparty}";
        var body = $"La cuota por {amount:N2} {currency} vence el {dueDate:dd/MM/yyyy}. Puedes registrar el cobro en 1-Tap desde la app.";

        return await SendPushNotificationAsync(userId, new PushNotificationMessage(title, body), ct);
    }
}
