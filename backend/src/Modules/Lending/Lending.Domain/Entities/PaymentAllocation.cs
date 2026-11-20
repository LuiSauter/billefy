namespace Lending.Domain.Entities;

public sealed class PaymentAllocation
{
    public Guid Id { get; private init; }
    public Guid PaymentId { get; private init; }
    public Guid InstallmentId { get; private init; }
    public decimal ToLateInterest { get; private init; }
    public decimal ToInterest { get; private init; }
    public decimal ToPrincipal { get; private init; }

    private PaymentAllocation()
    {
    }

    public PaymentAllocation(
        Guid id,
        Guid paymentId,
        Guid installmentId,
        decimal toLateInterest,
        decimal toInterest,
        decimal toPrincipal)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        PaymentId = paymentId;
        InstallmentId = installmentId;
        ToLateInterest = toLateInterest;
        ToInterest = toInterest;
        ToPrincipal = toPrincipal;
    }
}
