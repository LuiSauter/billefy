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
        DateTime createdAt)
        : base(id, userId, createdAt)
    {
        if (amount.Amount <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(amount), "Payment amount must be positive.");

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
