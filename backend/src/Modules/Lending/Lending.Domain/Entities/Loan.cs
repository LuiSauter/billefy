using BuildingBlocks.Common;
using BuildingBlocks.ValueObjects;
using Lending.Domain.Engine;
using Lending.Domain.Engine.DynamicPayments;
using Lending.Domain.Engine.Schemes;
using Lending.Domain.Enums;

namespace Lending.Domain.Entities;

public sealed class Loan : Entity
{
    private readonly List<LoanInstallment> _installments = [];
    private readonly List<LoanPayment> _payments = [];

    public Guid CounterpartyId { get; private init; }
    public Guid? DisbursementAccountId { get; private init; }
    public Guid? DisbursementTransactionId { get; private set; }
    public Guid? DisbursementReversalTransactionId { get; private set; }
    public LoanType Type { get; private init; }
    public LoanTemplate Template { get; private init; }
    public LoanStatus Status { get; private set; }
    public Money Principal { get; private init; }
    public decimal InterestRate { get; private init; }
    public RateUnit RateUnit { get; private init; }
    public DayCount DayCount { get; private init; }
    public PaymentFrequency Frequency { get; private init; }
    public int TotalInstallments { get; private init; }
    public DateOnly DisbursementDate { get; private init; }
    public DateOnly FirstDueDate { get; private init; }
    public decimal? LateRate { get; private init; }
    public int GraceDays { get; private init; }
    public PaymentAllocationOrder AllocationOrder { get; private init; }
    public EarlyPaymentPolicy EarlyPaymentPolicy { get; private init; }
    public decimal AnnualEffectiveRate { get; private init; }
    public decimal RemainingPrincipal { get; private set; }
    public DateTime? ActivatedAt { get; private set; }
    public DateTime? ClosedAt { get; private set; }

    public IReadOnlyCollection<LoanInstallment> Installments => _installments.AsReadOnly();
    public IReadOnlyCollection<LoanPayment> Payments => _payments.AsReadOnly();

    private Loan() : base()
    {
        Principal = Money.Zero(BuildingBlocks.Currencies.Currency.USD);
    }

    private Loan(
        Guid id,
        Guid userId,
        Guid counterpartyId,
        Guid? disbursementAccountId,
        LoanType type,
        LoanTemplate template,
        LoanStatus status,
        Money principal,
        decimal interestRate,
        RateUnit rateUnit,
        DayCount dayCount,
        PaymentFrequency frequency,
        int totalInstallments,
        DateOnly disbursementDate,
        DateOnly firstDueDate,
        decimal? lateRate,
        int graceDays,
        PaymentAllocationOrder allocationOrder,
        EarlyPaymentPolicy earlyPaymentPolicy,
        decimal annualEffectiveRate,
        decimal remainingPrincipal,
        DateTime createdAt,
        DateTime? activatedAt)
        : base(id, userId, createdAt)
    {
        CounterpartyId = counterpartyId;
        DisbursementAccountId = disbursementAccountId;
        Type = type;
        Template = template;
        Status = status;
        Principal = principal;
        InterestRate = interestRate;
        RateUnit = rateUnit;
        DayCount = dayCount;
        Frequency = frequency;
        TotalInstallments = totalInstallments;
        DisbursementDate = disbursementDate;
        FirstDueDate = firstDueDate;
        LateRate = lateRate;
        GraceDays = graceDays;
        AllocationOrder = allocationOrder;
        EarlyPaymentPolicy = earlyPaymentPolicy;
        AnnualEffectiveRate = annualEffectiveRate;
        RemainingPrincipal = remainingPrincipal;
        ActivatedAt = activatedAt;
    }

    public static Loan Create(
        Guid userId,
        Guid counterpartyId,
        Guid? disbursementAccountId,
        LoanType type,
        LoanTemplate template,
        Money principal,
        decimal interestRate,
        RateUnit rateUnit,
        DayCount dayCount,
        PaymentFrequency frequency,
        int totalInstallments,
        DateOnly disbursementDate,
        int graceDays = 0,
        decimal? lateRate = null,
        PaymentFrequency? compounding = null,
        int compoundingPeriods = 1,
        DateOnly? maturityDate = null,
        PaymentAllocationOrder allocationOrder = PaymentAllocationOrder.LateInterestInterestPrincipal,
        EarlyPaymentPolicy earlyPaymentPolicy = EarlyPaymentPolicy.AdvanceInstallments,
        bool activateImmediately = true,
        DateTime? createdAt = null)
    {
        if (principal.Amount <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(principal), "Principal must be positive.");

        var parameters = new LoanParameters(
            Principal: principal.Amount,
            Rate: interestRate,
            RateUnit: rateUnit,
            DayCount: dayCount,
            Frequency: frequency,
            TotalInstallments: totalInstallments,
            DisbursementDate: disbursementDate,
            GraceDays: graceDays,
            LateRate: lateRate,
            Compounding: compounding,
            CompoundingPeriods: compoundingPeriods,
            MaturityDate: maturityDate,
            AllocationOrder: allocationOrder,
            EarlyPaymentPolicy: earlyPaymentPolicy);

        var generator = LoanScheduleGeneratorFactory.Create(template);
        var schedule = generator.GenerateSchedule(parameters);

        var firstDueDate = schedule.Installments.Count > 0
            ? schedule.Installments[0].DueDate
            : disbursementDate.AddMonths(1);

        var now = createdAt ?? DateTime.UtcNow;
        var status = activateImmediately ? LoanStatus.Active : LoanStatus.PendingAcceptance;

        var loan = new Loan(
            Guid.NewGuid(),
            userId,
            counterpartyId,
            disbursementAccountId,
            type,
            template,
            status,
            principal,
            interestRate,
            rateUnit,
            dayCount,
            frequency,
            totalInstallments,
            disbursementDate,
            firstDueDate,
            lateRate,
            graceDays,
            allocationOrder,
            earlyPaymentPolicy,
            schedule.AnnualEffectiveRate,
            principal.Amount,
            now,
            activateImmediately ? now : null);

        foreach (var inst in schedule.Installments)
        {
            loan._installments.Add(new LoanInstallment(
                Guid.NewGuid(),
                loan.Id,
                inst.Number,
                inst.DueDate,
                inst.Principal,
                inst.Interest,
                inst.Total));
        }

        return loan;
    }

    public void LinkDisbursementTransaction(Guid transactionId)
    {
        if (DisbursementAccountId is null)
            throw new InvalidOperationException("A disbursement transaction requires a linked account.");
        if (transactionId == Guid.Empty)
            throw new ArgumentException("Transaction ID must not be empty.", nameof(transactionId));
        if (DisbursementTransactionId.HasValue)
            throw new InvalidOperationException("A disbursement transaction is already linked.");

        DisbursementTransactionId = transactionId;
    }

    public PaymentAllocationResult RecordPayment(
        decimal paymentAmount,
        DateTime paymentDateTime,
        Guid? accountId = null,
        Guid? ledgerTransactionId = null,
        string? note = null)
    {
        if (paymentAmount <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(paymentAmount), "Payment amount must be positive.");

        if (Status != LoanStatus.Active && Status != LoanStatus.InArrears)
            throw new InvalidOperationException($"Cannot apply payment to a loan with status '{Status}'.");

        var paymentDate = DateOnly.FromDateTime(paymentDateTime);
        var calculation = LoanPaymentCalculationAdapter.Calculate(this, paymentDate, paymentAmount);
        var maxSeq = _payments.Select(p => p.RecordSequence).Max();
        var nextSeq = (maxSeq ?? 0L) + 1L;
        var earlyAmount = calculation.ProposedEarlyPrincipalAmount > 0m ? calculation.ProposedEarlyPrincipalAmount : (decimal?)null;
        var earlyDate = calculation.ProposedEarlyPrincipalAmount > 0m ? calculation.ProposedEarlyPrincipalEffectiveDate : null;

        var money = Money.Of(paymentAmount, Principal.Currency);
        var payment = new LoanPayment(
            Guid.NewGuid(),
            UserId,
            Id,
            accountId,
            ledgerTransactionId,
            money,
            paymentDateTime,
            note,
            DateTime.UtcNow,
            nextSeq,
            LoanPaymentCalculationAdapter.CurrentCalculationVersion,
            earlyAmount,
            earlyDate);

        foreach (var alloc in calculation.ProposedAllocations)
        {
            var targetInstallment = _installments.First(i => i.Id == alloc.InstallmentId);
            targetInstallment.ApplyPayment(alloc.ToLateInterest, alloc.ToInterest, alloc.ToPrincipal);
            payment.AddAllocation(alloc.InstallmentId, alloc.ToLateInterest, alloc.ToInterest, alloc.ToPrincipal);
        }

        _payments.Add(payment);
        RemainingPrincipal = calculation.ResultingPrincipal;
        Status = calculation.ResultingState;
        if (Status == LoanStatus.Paid && ClosedAt is null)
        {
            ClosedAt = paymentDateTime;
        }

        return new PaymentAllocationResult(calculation.ProposedAllocations, decimal.Zero);
    }

    public void Forgive(DateTime forgivenAt)
    {
        if (Status == LoanStatus.Paid || Status == LoanStatus.Cancelled)
            throw new InvalidOperationException($"Cannot forgive loan in state '{Status}'.");

        foreach (var inst in _installments.Where(i => i.Status != InstallmentStatus.Paid))
        {
            inst.Forgive();
        }

        Status = LoanStatus.Forgiven;
        RemainingPrincipal = decimal.Zero;
        ClosedAt = forgivenAt;
    }

    public void Cancel(DateTime cancelledAt, Guid? reversalTransactionId = null)
    {
        if (Status != LoanStatus.Active)
            throw new InvalidOperationException($"Cannot cancel loan in state '{Status}'.");
        if (_payments.Count != 0)
            throw new InvalidOperationException("A loan with recorded payments cannot be cancelled.");
        if (DisbursementAccountId is null && DisbursementTransactionId.HasValue)
            throw new InvalidOperationException("A disbursement transaction cannot exist without an account.");
        if (DisbursementAccountId.HasValue != DisbursementTransactionId.HasValue)
            throw new InvalidOperationException("The loan disbursement linkage is incomplete.");
        if (DisbursementTransactionId.HasValue != reversalTransactionId.HasValue)
            throw new InvalidOperationException("A linked disbursement must be reversed exactly once when cancelling.");

        Status = LoanStatus.Cancelled;
        ClosedAt = cancelledAt;
        DisbursementReversalTransactionId = reversalTransactionId;
    }
}
