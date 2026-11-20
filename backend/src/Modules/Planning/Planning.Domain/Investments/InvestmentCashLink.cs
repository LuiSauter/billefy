using BuildingBlocks.Common;

namespace Planning.Domain.Investments;

public enum InvestmentCashKind { Contribution, Disposal }

public sealed class InvestmentCashLink : Entity
{
    public Guid InvestmentId { get; private set; }
    public Guid LedgerTransactionId { get; private set; }
    public InvestmentCashKind Kind { get; private set; }
    public DateTime LinkedAt { get; private set; }
    public Guid? ReversesLinkId { get; private set; }

    private InvestmentCashLink() : base() { }

    private InvestmentCashLink(Guid userId, Guid investmentId, Guid transactionId, InvestmentCashKind kind,
        DateTime linkedAt, Guid? reversesLinkId = null)
        : base(Guid.NewGuid(), userId, linkedAt)
    {
        if (investmentId == Guid.Empty || transactionId == Guid.Empty) throw new ArgumentException("Link identifiers are required.");
        InvestmentId = investmentId;
        LedgerTransactionId = transactionId;
        Kind = kind;
        LinkedAt = linkedAt;
        ReversesLinkId = reversesLinkId;
    }

    public static InvestmentCashLink Create(Guid userId, Guid investmentId, Guid transactionId,
        InvestmentCashKind kind, DateTime at, Guid? reversesLinkId = null) =>
        new(userId, investmentId, transactionId, kind, at, reversesLinkId);
}
