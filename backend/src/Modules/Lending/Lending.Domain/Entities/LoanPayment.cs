using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;

namespace Lending.Domain.Entities;

public sealed class LoanPayment : Entity
{
    private readonly List<PaymentAllocation> _allocations = [];

    public Guid LoanId { get; private init; }
    public Guid? AccountId { get; private init; }
    public Guid? LedgerTransactionId { get; private init; }
    public Money Amount { get; private init; }
    public DateTime PaymentDate { get; private init; }
    public string? Note { get; private init; }
    public long? RecordSequence { get; private init; }
    public int? CalculationVersion { get; private init; }
    public decimal? EarlyPrincipalAmount { get; private init; }
    public DateOnly? EarlyPrincipalEffectiveDate { get; private init; }

    public IReadOnlyCollection<PaymentAllocation> Allocations => _allocations.AsReadOnly();

    private LoanPayment() : base()
    {
        Amount = Money.Zero(BuildingBlocks.Currencies.Currency.USD);
    }

    public LoanPayment(
        Guid id,
        Guid userId,
        Guid loanId,
        Guid? accountId,
        Guid? ledgerTransactionId,
        Money amount,
        DateTime paymentDate,
        string? note,
        DateTime createdAt,
        long? recordSequence = null,
        int? calculationVersion = null,
        decimal? earlyPrincipalAmount = null,
        DateOnly? earlyPrincipalEffectiveDate = null)
        : base(id, userId, createdAt)
    {
        if (amount.Amount <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(amount), "Payment amount must be positive.");

        if (recordSequence is <= 0)
            throw new ArgumentOutOfRangeException(nameof(recordSequence), "Record sequence must be positive.");
        if (calculationVersion is <= 0)
            throw new ArgumentOutOfRangeException(nameof(calculationVersion), "Calculation version must be positive.");
        if (earlyPrincipalAmount.HasValue != earlyPrincipalEffectiveDate.HasValue || earlyPrincipalAmount is <= 0m)
            throw new ArgumentException("Early principal requires a positive amount and effective date.", nameof(earlyPrincipalAmount));
        if (earlyPrincipalEffectiveDate.HasValue && earlyPrincipalEffectiveDate.Value <= DateOnly.FromDateTime(paymentDate))
            throw new ArgumentException("Early principal must take effect after the payment date.", nameof(earlyPrincipalEffectiveDate));

        RecordSequence = recordSequence;
        CalculationVersion = calculationVersion;
        EarlyPrincipalAmount = earlyPrincipalAmount;
        EarlyPrincipalEffectiveDate = earlyPrincipalEffectiveDate;
        LoanId = loanId;
        AccountId = accountId;
        LedgerTransactionId = ledgerTransactionId;
        Amount = amount;
        PaymentDate = paymentDate;
        Note = note?.Trim();
    }

    public void AddAllocation(Guid installmentId, decimal toLate, decimal toInterest, decimal toPrincipal)
    {
        _allocations.Add(new PaymentAllocation(
            Guid.NewGuid(),
            Id,
            installmentId,
            toLate,
            toInterest,
            toPrincipal));
    }
}
