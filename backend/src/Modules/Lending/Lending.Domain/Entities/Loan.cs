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
    private readonly List<LoanPurchase> _purchases = [];
    public IReadOnlyCollection<LoanPurchase> Purchases => _purchases.AsReadOnly();
    public string? OriginationKind { get; private set; }
    public string? LoanKind { get; private set; }
    public Guid? CreationKey { get; private set; }
    public string? CreationFingerprint { get; private set; }

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

    public void SetAccountingOrigin(string originationKind, string loanKind, Guid? key, string fingerprint)
    {
        if (OriginationKind is not null) throw new InvalidOperationException("Loan origin is immutable.");
        if (originationKind is not ("OpeningBalance" or "CashDisbursement") || loanKind is not ("Loan" or "CreditCard"))
            throw new ArgumentException("Unknown accounting origin or loan kind.");
        OriginationKind = originationKind; LoanKind = loanKind; CreationKey = key; CreationFingerprint = fingerprint;
    }

    public LoanPurchase RecordPurchase(decimal amount, DateTime occurredAt, Guid ledgerTransactionId,
        Guid? categoryId, string? description, Guid? key, string fingerprint, DateTime createdAt)
    {
        if (LoanKind != "CreditCard" || Type != LoanType.Borrowed ||
            Status is not (LoanStatus.Active or LoanStatus.InArrears or LoanStatus.Paid))
            throw new InvalidOperationException("Only an operational credit card can record purchases.");
        if (DateOnly.FromDateTime(occurredAt) < DisbursementDate ||
            _payments.Any(p => DateOnly.FromDateTime(p.PaymentDate) >= DateOnly.FromDateTime(occurredAt)) ||
            _purchases.Any(p => p.OccurredAt > occurredAt))
            throw new InvalidOperationException("Purchase date cannot precede opening or a recorded operation.");
        if (amount <= 0m || decimal.Round(amount, Principal.Currency.DecimalPlaces) != amount)
            throw new InvalidOperationException("Purchase must be positive and currency-precise.");
        var installment = new LoanInstallment(Guid.NewGuid(), Id, _installments.Max(i => i.Number) + 1,
            DateOnly.FromDateTime(occurredAt).AddMonths(1), amount, 0m, amount);
        var purchase = new LoanPurchase(UserId, Id, installment.Id, ledgerTransactionId, amount, occurredAt,
            categoryId, description, key, fingerprint, createdAt);
        _installments.Add(installment);
        _purchases.Add(purchase);
        RemainingPrincipal += amount;
        Status = LoanStatus.Active;
        ClosedAt = null;
        return purchase;
    }

    public DynamicLoanPaymentResult CalculatePayment(DateOnly asOfDate, decimal? proposedAmount = null)
    {
        if (LoanKind != "CreditCard") return LoanPaymentCalculationAdapter.Calculate(this, asOfDate, proposedAmount);
        var view = CardView(asOfDate);
        var result = LoanPaymentCalculationAdapter.Calculate(view, asOfDate, proposedAmount);
        return result with { HistoricalSnapshots = view.Payments.Select(p =>
            LoanPaymentCalculationAdapter.Calculate(CardView(DateOnly.FromDateTime(p.PaymentDate)), DateOnly.FromDateTime(p.PaymentDate))
                .HistoricalSnapshots.Single(s => s.PaymentId == p.Id)).ToList() };
    }

    private Loan CardView(DateOnly asOfDate)
    {
        // Later purchases never exist in an older payment snapshot. New card
        // purchases after a payment must use a later calendar date, avoiding
        // an invented intra-day order in the existing date-based allocator.
        var view = new Loan(Id, UserId, CounterpartyId, DisbursementAccountId, Type, Template, Status, Principal,
            InterestRate, RateUnit, DayCount, Frequency, TotalInstallments, DisbursementDate, FirstDueDate,
            LateRate, GraceDays, AllocationOrder, EarlyPaymentPolicy, AnnualEffectiveRate, RemainingPrincipal, CreatedAt, ActivatedAt);
        var futureIds = _purchases.Where(p => DateOnly.FromDateTime(p.OccurredAt) > asOfDate).Select(p => p.InstallmentId).ToHashSet();
        view._installments.AddRange(_installments.Where(i => !futureIds.Contains(i.Id)));
        view._payments.AddRange(_payments.Where(p => DateOnly.FromDateTime(p.PaymentDate) <= asOfDate));
        return view;
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
        if (_purchases.Any(p => DateOnly.FromDateTime(p.OccurredAt) > paymentDate))
            throw new InvalidOperationException("Payment date cannot precede a recorded card purchase.");
        var calculation = CalculatePayment(paymentDate, paymentAmount);
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
        if (_payments.Count != 0 || _purchases.Count != 0)
            throw new InvalidOperationException("A loan with recorded payments or purchases cannot be cancelled.");
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
