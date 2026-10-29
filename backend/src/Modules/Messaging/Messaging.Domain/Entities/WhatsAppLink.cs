using BuildingBlocks.Common;

namespace Messaging.Domain.Entities;

public sealed class WhatsAppLink : Entity
{
    public string PhoneNumber { get; private set; }
    public WhatsAppLinkStatus Status { get; private set; }
    public string VerificationCode { get; private set; }
    public DateTime? ConfirmedAt { get; private set; }

    private WhatsAppLink() : base()
    {
        PhoneNumber = string.Empty;
        VerificationCode = string.Empty;
        Status = WhatsAppLinkStatus.Pending;
    }

    public WhatsAppLink(
        Guid id,
        Guid userId,
        string phoneNumber,
        WhatsAppLinkStatus status,
        string verificationCode,
        DateTime createdAt,
        DateTime? confirmedAt = null)
        : base(id, userId, createdAt)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new ArgumentException("Phone number cannot be empty.", nameof(phoneNumber));

        PhoneNumber = NormalizePhoneNumber(phoneNumber);
        Status = status;
        VerificationCode = verificationCode.Trim();
        ConfirmedAt = confirmedAt;
    }

    public static WhatsAppLink Create(
        Guid userId,
        string phoneNumber,
        string verificationCode,
        DateTime createdAt)
    {
        return new WhatsAppLink(
            Guid.NewGuid(),
            userId,
            phoneNumber,
            WhatsAppLinkStatus.Pending,
            verificationCode,
            createdAt);
    }

    public void Activate(DateTime confirmedAt)
    {
        Status = WhatsAppLinkStatus.Active;
        ConfirmedAt = confirmedAt;
    }

    public void RegenerateVerification(string phoneNumber, string verificationCode)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new ArgumentException("Phone number cannot be empty.", nameof(phoneNumber));

        PhoneNumber = NormalizePhoneNumber(phoneNumber);
        VerificationCode = verificationCode.Trim();
        Status = WhatsAppLinkStatus.Pending;
        ConfirmedAt = null;
    }

    public void Unlink()
    {
        Status = WhatsAppLinkStatus.Unlinked;
    }

    public static string NormalizePhoneNumber(string raw)
    {
        return raw.Trim().Replace(" ", "").Replace("-", "").Replace("+", "");
    }
}
