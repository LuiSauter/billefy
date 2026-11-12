using Lending.Domain.Engine;
using Lending.Domain.Enums;

namespace Lending.Domain.Engine.DynamicPayments;

public sealed record DynamicLoanInstallmentInput(
    Guid Id, int Number, DateOnly DueDate, decimal ExpectedPrincipal, decimal ExpectedInterest);

public sealed record DynamicLoanRecordedAllocation(
    Guid InstallmentId, decimal ToLateInterest, decimal ToInterest, decimal ToPrincipal);

public sealed record DynamicLoanRecordedPayment(
    DateOnly PaymentDate,
    DateTime CreatedAt,
    IReadOnlyList<DynamicLoanRecordedAllocation> Allocations,
    long? RecordSequence = null,
    int? CalculationVersion = null,
    decimal? EarlyPrincipalAmount = null,
    DateOnly? EarlyPrincipalEffectiveDate = null,
    Guid? PaymentId = null);

public sealed record DynamicLoanPaymentInput(
    IReadOnlyList<DynamicLoanInstallmentInput> OriginalInstallments,
    IReadOnlyList<DynamicLoanRecordedPayment> RecordedPayments,
    DateOnly AsOfDate,
    decimal? ProposedAmount,
    decimal? LateRate,
    RateUnit RateUnit,
    DayCount DayCount,
    int GraceDays,
    PaymentAllocationOrder AllocationOrder,
    EarlyPaymentPolicy EarlyPaymentPolicy,
    LoanType LoanType,
    LoanTemplate? Template = null,
    decimal? StatedRate = null,
    DateOnly? DisbursementDate = null,
    PaymentFrequency? Frequency = null);

public sealed record DynamicLoanInstallmentBalance(
    Guid InstallmentId, int Number, DateOnly DueDate,
    decimal OutstandingPrincipal, decimal OutstandingRegularInterest,
    decimal OutstandingLateInterest, decimal TotalOutstanding);

public sealed record DynamicLoanHistoricalSnapshot(
    DateOnly PaymentDate, DateTime CreatedAt, long? RecordSequence,
    decimal? RemainingTotal, bool IsAmbiguous, Guid? PaymentId = null);

public sealed record DynamicLoanPaymentResult(
    IReadOnlyList<DynamicLoanInstallmentBalance> Installments,
    decimal TotalPayoff, decimal? SuggestedAmount,
    IReadOnlyList<PaymentAllocationDetail> ProposedAllocations,
    decimal ResultingPrincipal, LoanStatus ResultingState,
    IReadOnlyList<DynamicLoanHistoricalSnapshot> HistoricalSnapshots,
    IReadOnlyList<DynamicLoanInstallmentBalance> ProjectedInstallments,
    decimal ProposedEarlyPrincipalAmount,
    DateOnly? ProposedEarlyPrincipalEffectiveDate);

/// <summary>Pure replay of immutable scheduled obligations and recorded component allocations.</summary>
public static class DynamicLoanPaymentCalculator
{
    public static DynamicLoanPaymentResult Calculate(DynamicLoanPaymentInput input)
    {
        ArgumentNullException.ThrowIfNull(input);
        if (input.GraceDays < 0) throw new ArgumentOutOfRangeException(nameof(input.GraceDays));
        if (input.ProposedAmount is <= 0) throw new ArgumentOutOfRangeException(nameof(input.ProposedAmount));
        ValidateCompatibility(input.Template, input.EarlyPaymentPolicy);
        var reducesPrincipal = input.EarlyPaymentPolicy is EarlyPaymentPolicy.ReduceTerm or EarlyPaymentPolicy.ReduceInstallment;
        var supportedReduction = input.Template is LoanTemplate.NoInterest or LoanTemplate.SimpleOnBalance or LoanTemplate.FixedInstallment
            || (input.Template == LoanTemplate.InterestOnly && input.EarlyPaymentPolicy == EarlyPaymentPolicy.ReduceInstallment);
        if (reducesPrincipal && !supportedReduction)
            throw new NotSupportedException("A reduction policy requires an explicit compatible loan template.");
        if (reducesPrincipal && input.Template is LoanTemplate.SimpleOnBalance or LoanTemplate.FixedInstallment or LoanTemplate.InterestOnly
            && (!input.StatedRate.HasValue || !input.DisbursementDate.HasValue || !input.Frequency.HasValue))
            throw new ArgumentException("Interest-bearing projections require the stated rate, disbursement date, and frequency.", nameof(input));
        ValidateEarlyPrincipalEvents(input);
        var lastDate = input.RecordedPayments.Select(p => p.PaymentDate).DefaultIfEmpty(DateOnly.MinValue).Max();
        if (input.AsOfDate < lastDate)
            throw new InvalidOperationException("Calculation date cannot precede the last recorded payment.");

        var ordered = input.RecordedPayments
            .OrderBy(p => p.PaymentDate)
            .ThenBy(p => p.RecordSequence.HasValue ? 1 : 0)
            .ThenBy(p => p.RecordSequence)
            .ThenBy(p => p.CreatedAt)
            .ToList();
        var ambiguousDates = ordered.Where(p => p.RecordSequence is null).GroupBy(p => (p.PaymentDate, p.CreatedAt))
            .Where(g => g.Count() > 1)
            .Select(g => g.Key).ToHashSet();
        var states = input.OriginalInstallments.ToDictionary(i => i.Id, i => new ReplayState(i));
        var settledInstallments = new HashSet<Guid>();
        var snapshots = new List<DynamicLoanHistoricalSnapshot>();
        var cursor = input.OriginalInstallments.Select(i => i.DueDate.AddDays(input.GraceDays)).DefaultIfEmpty(input.AsOfDate).Min();
        var rawLate = states.Keys.ToDictionary(id => id, _ => decimal.Zero);

        foreach (var payment in ordered)
        {
            Accrue(cursor, payment.PaymentDate);
            foreach (var allocation in payment.Allocations)
            {
                if (!states.TryGetValue(allocation.InstallmentId, out var state))
                    throw new ArgumentException("Recorded allocation references an unknown installment.", nameof(input));
                if (allocation.ToLateInterest < 0 || allocation.ToInterest < 0 || allocation.ToPrincipal < 0)
                    throw new ArgumentException("Recorded allocations cannot be negative.", nameof(input));
                state.PaidLate += allocation.ToLateInterest;
                state.PaidInterest += allocation.ToInterest;
                state.PaidPrincipal += allocation.ToPrincipal;
                if (state.Principal == 0m && state.Interest == 0m)
                    settledInstallments.Add(allocation.InstallmentId);
            }
            if (payment.EarlyPrincipalAmount.HasValue)
            {
                // Materialize this event's projection before later payments can earn or pay its components.
                // Later recorded events must not influence this event's protected-interest horizon.
                var current = BuildBalances(payment.PaymentDate);
                var projection = input.Template == LoanTemplate.FixedInstallment
                    ? FixedInstallmentProjection.Reduce(current, input, payment.EarlyPrincipalAmount.Value,
                        payment.EarlyPrincipalEffectiveDate!.Value, settledInstallments)
                    : ProjectPolicySchedule(current, input with { RecordedPayments = [] }, payment.EarlyPrincipalAmount.Value,
                        payment.EarlyPrincipalEffectiveDate, [], payment.PaymentDate, settledInstallments);
                var projectedById = projection.ToDictionary(row => row.InstallmentId);
                foreach (var (id, state) in states)
                {
                    projectedById.TryGetValue(id, out var row);
                    state.SetPrincipal(row?.OutstandingPrincipal ?? 0m);
                    state.SetInterest(row?.OutstandingRegularInterest ?? 0m);
                }
            }
            var ambiguous = payment.RecordSequence is null && ambiguousDates.Contains((payment.PaymentDate, payment.CreatedAt));
            snapshots.Add(new DynamicLoanHistoricalSnapshot(payment.PaymentDate, payment.CreatedAt,
                payment.RecordSequence, ambiguous ? null : TotalOutstanding(payment.PaymentDate), ambiguous, payment.PaymentId));
            cursor = payment.PaymentDate;
        }
        Accrue(cursor, input.AsOfDate);

        var balances = BuildBalances(input.AsOfDate);
        var policyBalances = reducesPrincipal
            ? ProjectPolicySchedule(balances, input, 0m, null, [], input.AsOfDate, settledInstallments)
            : balances;
        var payoff = reducesPrincipal ? CalculatePolicyPayoff(policyBalances, input.AsOfDate) : policyBalances.Sum(b => b.TotalOutstanding);
        IReadOnlyList<PaymentAllocationDetail> preview = [];
        var proposedEarlyPrincipal = decimal.Zero;
        DateOnly? proposedEffectiveDate = null;
        if (input.ProposedAmount.HasValue)
        {
            var allocatorStates = policyBalances
                .Where(b => !reducesPrincipal || b.DueDate <= input.AsOfDate)
                .Select(b => new InstallmentPaymentState
                {
                    Id = b.InstallmentId,
                    Number = b.Number,
                    DueDate = b.DueDate,
                    ExpectedPrincipal = b.OutstandingPrincipal,
                    ExpectedInterest = b.OutstandingRegularInterest,
                    PaidLateInterest = 0m,
                    CalculatedLateInterest = b.OutstandingLateInterest
                }).ToList();
            var allocation = PaymentAllocator.Allocate(input.ProposedAmount.Value, allocatorStates, input.AllocationOrder);
            var proposedAllocations = allocation.Allocations.ToList();
            var remainingAfterDue = allocation.RemainingUnallocatedAmount;
            if (remainingAfterDue > 0m)
            {
                if (!reducesPrincipal)
                    throw new InvalidOperationException("Payment amount exceeds the total outstanding payoff.");
                var principalAfterDue = policyBalances.Sum(b => b.OutstandingPrincipal) - allocation.Allocations.Sum(a => a.ToPrincipal);
                var protectedRow = policyBalances.Where(b => b.DueDate > input.AsOfDate)
                    .OrderBy(b => b.DueDate).ThenBy(b => b.Number).FirstOrDefault();
                var protectedInterest = protectedRow?.OutstandingRegularInterest ?? 0m;
                var protectedPaid = Math.Min(protectedInterest, Math.Max(0m, remainingAfterDue - principalAfterDue));
                if (protectedPaid > 0m && protectedRow is not null)
                {
                    proposedAllocations.Add(new PaymentAllocationDetail(protectedRow.InstallmentId, protectedRow.Number,
                        0m, protectedPaid, 0m, protectedRow.TotalOutstanding - protectedPaid));
                    remainingAfterDue -= protectedPaid;
                }
                if (remainingAfterDue > principalAfterDue)
                    throw new InvalidOperationException("Payment amount exceeds the policy-specific payoff.");
                proposedEarlyPrincipal = remainingAfterDue;
                if (proposedEarlyPrincipal > 0m)
                {
                    proposedEffectiveDate = input.OriginalInstallments.Where(i => i.DueDate > input.AsOfDate)
                        .Select(i => (DateOnly?)i.DueDate).Min();
                    if (proposedEffectiveDate is null)
                        throw new InvalidOperationException("Early principal requires a future original installment boundary.");
                }
            }
            preview = proposedAllocations;
        }
        var remainingPrincipal = policyBalances.Sum(b => b.OutstandingPrincipal);
        var allocatedByInstallment = preview.ToDictionary(a => a.InstallmentId);
        var postPaymentTotal = payoff;
        var postPaymentPrincipal = remainingPrincipal - preview.Sum(a => a.ToPrincipal) - proposedEarlyPrincipal;
        postPaymentTotal -= preview.Sum(a => a.ToPrincipal) + preview.Sum(a => a.ToInterest) + preview.Sum(a => a.ToLateInterest)
            + proposedEarlyPrincipal;
        var closed = postPaymentTotal <= 0m;
        var projected = reducesPrincipal
            ? ProjectPolicySchedule(balances, input, proposedEarlyPrincipal, proposedEffectiveDate, preview, input.AsOfDate, settledInstallments)
            : balances;
        var arrears = balances.Any(balance => balance.DueDate < input.AsOfDate
            && balance.TotalOutstanding > (allocatedByInstallment.TryGetValue(balance.InstallmentId, out var allocation)
                ? allocation.ToLateInterest + allocation.ToInterest + allocation.ToPrincipal : 0m));
        return new DynamicLoanPaymentResult(balances, payoff, balances.FirstOrDefault(b => b.TotalOutstanding > 0m)?.TotalOutstanding,
            preview, postPaymentPrincipal, closed ? LoanStatus.Paid : arrears ? LoanStatus.InArrears : LoanStatus.Active, snapshots,
            projected, proposedEarlyPrincipal, proposedEffectiveDate);

        void Accrue(DateOnly start, DateOnly end)
        {
            if (end <= start || !input.LateRate.HasValue || input.LateRate.Value <= 0m) return;
            var dailyRate = LoanMathHelper.CalculateDailyRate(input.LateRate.Value, input.RateUnit, input.DayCount);
            foreach (var (id, state) in states)
            {
                var accrualStart = Max(start, state.Input.DueDate.AddDays(input.GraceDays));
                if (end > accrualStart && state.Principal > 0m)
                    rawLate[id] += state.Principal * dailyRate * (end.DayNumber - accrualStart.DayNumber);
            }
        }

        IReadOnlyList<DynamicLoanInstallmentBalance> BuildBalances(DateOnly date) => input.OriginalInstallments
            .OrderBy(i => i.DueDate).ThenBy(i => i.Number).Select(i =>
            {
                var state = states[i.Id];
                var late = Math.Max(0m, LoanMathHelper.Round(rawLate[i.Id]) - state.PaidLate);
                var principal = state.Principal;
                var interest = state.Interest;
                return new DynamicLoanInstallmentBalance(i.Id, i.Number, i.DueDate, principal, interest,
                    late, principal + interest + late);
            }).ToList();

        decimal TotalOutstanding(DateOnly date) => reducesPrincipal
            ? CalculatePolicyPayoff(BuildBalances(date), date)
            : BuildBalances(date).Sum(b => b.TotalOutstanding);
    }

    public static bool IsCompatible(LoanTemplate template, EarlyPaymentPolicy policy) => (template, policy) switch
    {
        (LoanTemplate.NoInterest or LoanTemplate.SimpleOnBalance or LoanTemplate.FixedInstallment,
            EarlyPaymentPolicy.AdvanceInstallments or EarlyPaymentPolicy.ReduceInstallment or EarlyPaymentPolicy.ReduceTerm) => true,
        (LoanTemplate.InterestOnly, EarlyPaymentPolicy.AdvanceInstallments or EarlyPaymentPolicy.ReduceInstallment) => true,
        (LoanTemplate.FlatOnInitialCapital or LoanTemplate.SinglePaymentCompound, EarlyPaymentPolicy.AdvanceInstallments) => true,
        _ => false
    };

    private static void ValidateCompatibility(LoanTemplate? template, EarlyPaymentPolicy policy)
    {
        if (template.HasValue && !IsCompatible(template.Value, policy))
            throw new ArgumentException($"Policy '{policy}' is incompatible with template '{template}'.");
    }

    private static void ValidateEarlyPrincipalEvents(DynamicLoanPaymentInput input)
    {
        if (input.RecordedPayments.Any(p => p.EarlyPrincipalAmount.HasValue || p.EarlyPrincipalEffectiveDate.HasValue)
            && (input.Template is not (LoanTemplate.NoInterest or LoanTemplate.SimpleOnBalance or LoanTemplate.FixedInstallment or LoanTemplate.InterestOnly)
                || input.EarlyPaymentPolicy is not (EarlyPaymentPolicy.ReduceInstallment or EarlyPaymentPolicy.ReduceTerm)
                || (input.Template == LoanTemplate.InterestOnly && input.EarlyPaymentPolicy == EarlyPaymentPolicy.ReduceTerm)))
            throw new NotSupportedException("Early-principal replay is not supported for this template and policy.");
        foreach (var payment in input.RecordedPayments)
        {
            if (payment.EarlyPrincipalAmount is null && payment.EarlyPrincipalEffectiveDate is null) continue;
            if (payment.EarlyPrincipalAmount is null or <= 0m || payment.EarlyPrincipalEffectiveDate is null)
                throw new ArgumentException("Early principal requires a positive amount and effective date.", nameof(input));
            var expected = input.OriginalInstallments.Where(i => i.DueDate > payment.PaymentDate)
                .Select(i => (DateOnly?)i.DueDate).Min();
            if (expected != payment.EarlyPrincipalEffectiveDate)
                throw new ArgumentException("Early principal must take effect at the next original installment date.", nameof(input));
        }
    }

    private static IReadOnlyList<DynamicLoanInstallmentBalance> ProjectPolicySchedule(
        IReadOnlyList<DynamicLoanInstallmentBalance> balances, DynamicLoanPaymentInput input,
        decimal proposedAmount, DateOnly? proposedEffectiveDate,
        IReadOnlyList<PaymentAllocationDetail> allocations, DateOnly asOfDate, IReadOnlySet<Guid> settledInstallments)
    {
        var rows = balances.OrderBy(b => b.DueDate).ThenBy(b => b.Number).ToList();
        if (input.Template == LoanTemplate.FixedInstallment)
        {
            var paid = ApplyPaymentToProjection(rows, allocations, asOfDate);
            var newlySettled = paid.Where(row => row.OutstandingPrincipal == 0m && row.OutstandingRegularInterest == 0m
                && allocations.Any(a => a.InstallmentId == row.InstallmentId)).Select(row => row.InstallmentId);
            var fixedSettled = settledInstallments.Concat(newlySettled).ToHashSet();
            var fixedProjection = proposedAmount > 0m && proposedEffectiveDate.HasValue
                ? FixedInstallmentProjection.Reduce(paid, input, proposedAmount, proposedEffectiveDate.Value, fixedSettled)
                : paid;
            return fixedProjection.Where(row => input.EarlyPaymentPolicy != EarlyPaymentPolicy.ReduceTerm
                || row.TotalOutstanding > 0m).ToList();
        }
        var reductions = proposedAmount > 0m && proposedEffectiveDate.HasValue
            ? new[] { (Date: proposedEffectiveDate.Value, Amount: proposedAmount) }
            : [];
        foreach (var (date, amount) in reductions)
        {
            var eligible = rows.Select((row, index) => (row, index))
                .Where(x => x.row.DueDate >= date && !settledInstallments.Contains(x.row.InstallmentId)
                    && (input.Template != LoanTemplate.InterestOnly || x.row.OutstandingPrincipal > 0m)).ToList();
            var current = eligible.Sum(x => x.row.OutstandingPrincipal);
            if (amount > current) throw new ArgumentException("Early principal exceeds remaining scheduled principal.", nameof(input));
            if (input.EarlyPaymentPolicy == EarlyPaymentPolicy.ReduceInstallment)
            {
                var target = current - amount;
                var portion = eligible.Count == 0 ? 0m : LoanMathHelper.Round(target / eligible.Count);
                decimal assigned = 0m;
                for (var n = 0; n < eligible.Count; n++)
                {
                    var (row, index) = eligible[n];
                    var principal = n == eligible.Count - 1 ? target - assigned : Math.Min(portion, target - assigned);
                    assigned += principal;
                    rows[index] = row with
                    {
                        OutstandingPrincipal = principal,
                        TotalOutstanding = principal + row.OutstandingRegularInterest + row.OutstandingLateInterest
                    };
                }
            }
            else
            {
                var reductionLeft = amount;
                foreach (var (row, index) in eligible.AsEnumerable().Reverse())
                {
                    var reduction = Math.Min(row.OutstandingPrincipal, reductionLeft);
                    reductionLeft -= reduction;
                    var principal = row.OutstandingPrincipal - reduction;
                    rows[index] = row with
                    {
                        OutstandingPrincipal = principal,
                        TotalOutstanding = principal + row.OutstandingRegularInterest + row.OutstandingLateInterest
                    };
                    if (reductionLeft == 0m) break;
                }
            }
        }
        if (input.EarlyPaymentPolicy == EarlyPaymentPolicy.ReduceTerm)
            rows.RemoveAll(row => row.OutstandingPrincipal == 0m
                && row.OutstandingRegularInterest == 0m && row.OutstandingLateInterest == 0m);
        var projected = ApplyPaymentToProjection(rows, allocations, asOfDate).ToList();
        if (input.Template == LoanTemplate.NoInterest) return projected;

        var protectedDates = input.RecordedPayments.Where(p => p.EarlyPrincipalEffectiveDate.HasValue)
            .Select(p => p.EarlyPrincipalEffectiveDate!.Value).ToHashSet();
        var nextDue = input.OriginalInstallments.Where(i => i.DueDate > asOfDate)
            .Select(i => (DateOnly?)i.DueDate).Min();
        if (nextDue.HasValue) protectedDates.Add(nextDue.Value);
        if (proposedAmount > 0m && proposedEffectiveDate.HasValue) protectedDates.Add(proposedEffectiveDate.Value);

        var originalOrder = input.OriginalInstallments.OrderBy(i => i.DueDate).ThenBy(i => i.Number).ToList();
        var periodStarts = new Dictionary<Guid, DateOnly>();
        var prior = input.DisbursementDate!.Value;
        foreach (var original in originalOrder)
        {
            periodStarts[original.Id] = prior;
            prior = original.DueDate;
        }
        var openingPrincipal = projected.Sum(row => row.OutstandingPrincipal);
        for (var index = 0; index < projected.Count; index++)
        {
            var row = projected[index];
            if (row.DueDate <= asOfDate || settledInstallments.Contains(row.InstallmentId)) continue;
            var interest = row.OutstandingRegularInterest;
            if (!protectedDates.Contains(row.DueDate))
            {
                var periodicRate = LoanMathHelper.CalculatePeriodicRate(input.StatedRate!.Value,
                    input.RateUnit, input.DayCount, input.Frequency!.Value, periodStarts[row.InstallmentId], row.DueDate);
                interest = LoanMathHelper.Round(openingPrincipal * periodicRate);
            }
            projected[index] = row with
            {
                OutstandingRegularInterest = interest,
                TotalOutstanding = row.OutstandingPrincipal + interest + row.OutstandingLateInterest
            };
            openingPrincipal = Math.Max(0m, openingPrincipal - row.OutstandingPrincipal);
        }
        if (input.EarlyPaymentPolicy == EarlyPaymentPolicy.ReduceTerm)
            projected.RemoveAll(row => row.OutstandingPrincipal == 0m
                && row.OutstandingRegularInterest == 0m && row.OutstandingLateInterest == 0m);
        return projected;
    }

    private static decimal CalculatePolicyPayoff(
        IReadOnlyList<DynamicLoanInstallmentBalance> projection, DateOnly asOfDate)
    {
        var dueInterest = projection.Where(row => row.DueDate <= asOfDate)
            .Sum(row => row.OutstandingRegularInterest);
        var protectedInterest = projection.Where(row => row.DueDate > asOfDate)
            .OrderBy(row => row.DueDate).ThenBy(row => row.Number)
            .Select(row => row.OutstandingRegularInterest).FirstOrDefault();
        return projection.Sum(row => row.OutstandingPrincipal + row.OutstandingLateInterest)
            + dueInterest + protectedInterest;
    }

    private static IReadOnlyList<DynamicLoanInstallmentBalance> ApplyPaymentToProjection(
        IReadOnlyList<DynamicLoanInstallmentBalance> projection,
        IReadOnlyList<PaymentAllocationDetail> allocations, DateOnly asOfDate)
    {
        var byInstallment = allocations.ToDictionary(a => a.InstallmentId);
        return projection.Select(row =>
        {
            byInstallment.TryGetValue(row.InstallmentId, out var allocation);
            var principal = row.OutstandingPrincipal - (allocation?.ToPrincipal ?? 0m);
            var interest = row.OutstandingRegularInterest - (allocation?.ToInterest ?? 0m);
            var late = row.OutstandingLateInterest - (allocation?.ToLateInterest ?? 0m);
            return row with
            {
                OutstandingPrincipal = principal,
                OutstandingRegularInterest = interest,
                OutstandingLateInterest = late,
                TotalOutstanding = principal + interest + late
            };
        }).Where(row => row.DueDate > asOfDate || row.TotalOutstanding > 0m).ToList();
    }

    private static DateOnly Max(DateOnly a, DateOnly b) => a > b ? a : b;

    private sealed class ReplayState(DynamicLoanInstallmentInput input)
    {
        public DynamicLoanInstallmentInput Input { get; } = input;
        public decimal PaidPrincipal { get; set; }
        public decimal PaidInterest { get; set; }
        public decimal PaidLate { get; set; }
        private decimal PrincipalAdjustment { get; set; }
        private decimal ProjectedInterest { get; set; } = input.ExpectedInterest;
        public decimal Principal => Math.Max(0m, Input.ExpectedPrincipal - PaidPrincipal - PrincipalAdjustment);
        public decimal Interest => Math.Max(0m, ProjectedInterest - PaidInterest);
        public void SetPrincipal(decimal principal) =>
            PrincipalAdjustment = Input.ExpectedPrincipal - PaidPrincipal - principal;
        public void SetInterest(decimal interest) => ProjectedInterest = PaidInterest + interest;
    }
}
