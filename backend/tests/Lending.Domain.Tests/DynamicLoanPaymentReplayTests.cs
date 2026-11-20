using FluentAssertions;
using Lending.Domain.Engine.DynamicPayments;
using Lending.Domain.Enums;
using Xunit;

namespace Lending.Domain.Tests;

public class DynamicLoanPaymentReplayTests
{
    private static DynamicLoanPaymentInput Input(
        DateOnly asOf,
        IReadOnlyList<DynamicLoanInstallmentInput> installments,
        IReadOnlyList<DynamicLoanRecordedPayment>? payments = null,
        decimal? proposed = null) => new(
            installments, payments ?? [], asOf, proposed, 0.03m, RateUnit.Monthly,
            DayCount.Thirty360, 0, PaymentAllocationOrder.LateInterestInterestPrincipal,
            EarlyPaymentPolicy.AdvanceInstallments, LoanType.Lent);

    [Theory]
    [InlineData(LoanTemplate.SimpleOnBalance, EarlyPaymentPolicy.ReduceInstallment)]
    [InlineData(LoanTemplate.SimpleOnBalance, EarlyPaymentPolicy.ReduceTerm)]
    [InlineData(LoanTemplate.InterestOnly, EarlyPaymentPolicy.ReduceInstallment)]
    public void NonFixedReduction_DoesNotReopenSettledFutureComponents(LoanTemplate template, EarlyPaymentPolicy policy)
    {
        var interestOnly = template == LoanTemplate.InterestOnly;
        var rows = interestOnly ? InterestOnlyRows() : SimpleRows();
        var originals = rows.ToArray();
        var firstAllocation = new DynamicLoanRecordedAllocation(rows[0].Id, 0m, 30m, interestOnly ? 0m : 100m);
        var secondAllocation = new DynamicLoanRecordedAllocation(rows[1].Id, 0m, interestOnly ? 30m : 20m, interestOnly ? 0m : 100m);
        var first = new DynamicLoanRecordedPayment(new DateOnly(2026, 10, 13), new DateTime(2026, 10, 13),
            [firstAllocation], PaymentId: Guid.NewGuid());
        var second = new DynamicLoanRecordedPayment(new DateOnly(2026, 10, 14), new DateTime(2026, 10, 14),
            [secondAllocation], PaymentId: Guid.NewGuid());
        var input = Input(new DateOnly(2026, 10, 15), rows, [first, second], 50m) with
        {
            Template = template,
            EarlyPaymentPolicy = policy,
            StatedRate = 0.10m,
            DisbursementDate = new DateOnly(2026, 10, 1),
            Frequency = PaymentFrequency.Monthly
        };
        var originalReplay = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = null });
        var quote = DynamicLoanPaymentCalculator.Calculate(input);
        var settledProjection = quote.ProjectedInstallments.FirstOrDefault(i => i.InstallmentId == rows[1].Id);
        (settledProjection?.OutstandingRegularInterest ?? 0m).Should().Be(0m);
        (settledProjection?.OutstandingPrincipal ?? 0m).Should().Be(0m);
        quote.ProjectedInstallments.Where(i => i.Number <= 2).Should().OnlyContain(i => i.TotalOutstanding == 0m);
        quote.ProposedEarlyPrincipalAmount.Should().Be(50m);
        quote.ProposedAllocations.Should().BeEmpty();
        quote.ProjectedInstallments.Single(i => i.Number == 3).OutstandingPrincipal.Should().Be(interestOnly ? 250m : 50m);
        quote.ProjectedInstallments.Single(i => i.Number == 3).OutstandingRegularInterest.Should().Be(interestOnly ? 25m : 5m);
        var early = new DynamicLoanRecordedPayment(input.AsOfDate, new DateTime(2026, 10, 15), [], 1, 1,
            quote.ProposedEarlyPrincipalAmount, quote.ProposedEarlyPrincipalEffectiveDate, Guid.NewGuid());
        var replayInput = input with { RecordedPayments = [first, second, early], ProposedAmount = null };
        var replay = DynamicLoanPaymentCalculator.Calculate(replayInput);
        replay.Installments.Where(i => i.Number <= 2).Should().OnlyContain(i => i.TotalOutstanding == 0m);
        replay.ProjectedInstallments.Should().Equal(quote.ProjectedInstallments);
        replay.HistoricalSnapshots.Take(2).Should().Equal(originalReplay.HistoricalSnapshots);
        var requote = DynamicLoanPaymentCalculator.Calculate(replayInput with { ProposedAmount = 25m });
        requote.ProjectedInstallments.Where(i => i.Number <= 2).Should().OnlyContain(i => i.TotalOutstanding == 0m);
        requote.HistoricalSnapshots.Should().Equal(replay.HistoricalSnapshots);
        requote.ProjectedInstallments.Single(i => i.Number == 3).OutstandingPrincipal.Should().Be(interestOnly ? 225m : 25m);
        requote.ProjectedInstallments.Single(i => i.Number == 3).OutstandingRegularInterest.Should().Be(interestOnly ? 22.50m : 2.50m);
        first.Allocations.Should().Equal(firstAllocation);
        second.Allocations.Should().Equal(secondAllocation);
        rows.Should().Equal(originals);
    }

    [Theory]
    [InlineData(LoanTemplate.SimpleOnBalance, EarlyPaymentPolicy.ReduceInstallment)]
    [InlineData(LoanTemplate.SimpleOnBalance, EarlyPaymentPolicy.ReduceTerm)]
    [InlineData(LoanTemplate.InterestOnly, EarlyPaymentPolicy.ReduceInstallment)]
    public void NonFixedReduction_LeavesZeroPrincipalEarnedInterestCollectible(LoanTemplate template, EarlyPaymentPolicy policy)
    {
        var rows = template == LoanTemplate.InterestOnly ? InterestOnlyRows() : SimpleRows();
        var input = Input(new DateOnly(2026, 10, 15), rows, proposed: 300m) with
        {
            Template = template,
            EarlyPaymentPolicy = policy,
            StatedRate = 0.10m,
            DisbursementDate = new DateOnly(2026, 10, 1),
            Frequency = PaymentFrequency.Monthly
        };
        var quote = DynamicLoanPaymentCalculator.Calculate(input);
        var first = quote.ProjectedInstallments.Single(i => i.Number == 1);
        first.OutstandingPrincipal.Should().Be(0m);
        first.OutstandingRegularInterest.Should().Be(30m);
        quote.ResultingState.Should().Be(LoanStatus.Active);
        var early = new DynamicLoanRecordedPayment(input.AsOfDate, new DateTime(2026, 10, 15), [], 1, 1,
            quote.ProposedEarlyPrincipalAmount, quote.ProposedEarlyPrincipalEffectiveDate);
        var duePayment = DynamicLoanPaymentCalculator.Calculate(input with
        {
            AsOfDate = rows[0].DueDate,
            ProposedAmount = 30m,
            RecordedPayments = [early]
        });
        duePayment.ProposedAllocations.Single().InstallmentId.Should().Be(rows[0].Id);
        duePayment.ProposedAllocations.Single().ToInterest.Should().Be(30m);
        duePayment.ProposedAllocations.Single().ToPrincipal.Should().Be(0m);
    }

    [Fact]
    public void SimpleOnBalance_ReduceTermKeepsFixedPrincipalAndRemovesZeroTail()
    {
        var rows = SimpleRows();
        var result = CalculateInterestInput(rows, new DateOnly(2026, 10, 15), 100m, EarlyPaymentPolicy.ReduceTerm);

        result.ProposedEarlyPrincipalAmount.Should().Be(100m);
        result.ProposedEarlyPrincipalEffectiveDate.Should().Be(new DateOnly(2026, 11, 1));
        result.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(100m, 100m);
        result.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(30m, 10m);
        result.TotalPayoff.Should().Be(330m);
        rows.Select(i => i.ExpectedPrincipal).Should().Equal(100m, 100m, 100m);
    }

    [Fact]
    public void SimpleOnBalance_ReduceTermExactPayoffIncludesProtectedInterestAndClosesProjection()
    {
        var result = CalculateInterestInput(SimpleRows(), new DateOnly(2026, 10, 15), 330m,
            EarlyPaymentPolicy.ReduceTerm);

        result.ProposedAllocations.Should().ContainSingle().Which.ToInterest.Should().Be(30m);
        result.ProposedEarlyPrincipalAmount.Should().Be(300m);
        result.TotalPayoff.Should().Be(330m);
        result.ResultingPrincipal.Should().Be(0m);
        result.ResultingState.Should().Be(LoanStatus.Paid);
        result.ProjectedInstallments.Should().BeEmpty();
        var oneCentOver = () => CalculateInterestInput(SimpleRows(), new DateOnly(2026, 10, 15), 330.01m,
            EarlyPaymentPolicy.ReduceTerm);
        oneCentOver.Should().Throw<InvalidOperationException>();

        var principalOnly = CalculateInterestInput(SimpleRows(), new DateOnly(2026, 10, 15), 300m,
            EarlyPaymentPolicy.ReduceTerm);
        principalOnly.ResultingPrincipal.Should().Be(0m);
        principalOnly.ResultingState.Should().NotBe(LoanStatus.Paid);
        principalOnly.TotalPayoff.Should().Be(330m);
    }

    [Fact]
    public void SimpleOnBalance_ReduceTermReplayMatchesQuoteAndCombinesRepeatedBoundaryEvents()
    {
        var rows = SimpleRows();
        var quote = CalculateInterestInput(rows, new DateOnly(2026, 10, 15), 100m, EarlyPaymentPolicy.ReduceTerm);
        var first = new DynamicLoanRecordedPayment(new DateOnly(2026, 10, 15), new DateTime(2026, 10, 15), [],
            1, 1, 40m, new DateOnly(2026, 11, 1));
        var second = first with { RecordSequence = 2, EarlyPrincipalAmount = 60m };
        var replay = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 10, 15), rows, [first, second]) with
        {
            Template = LoanTemplate.SimpleOnBalance,
            StatedRate = 0.10m,
            DisbursementDate = new DateOnly(2026, 10, 1),
            Frequency = PaymentFrequency.Monthly,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceTerm
        });

        replay.ResultingPrincipal.Should().Be(200m);
        replay.TotalPayoff.Should().Be(230m);
        replay.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(
            quote.ProjectedInstallments.Select(i => i.OutstandingPrincipal));
        replay.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(30m, 10m);
        rows.Select(i => i.ExpectedPrincipal).Should().Equal(100m, 100m, 100m);
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment, 66.67, 66.67, 66.66, 13.33, 6.67)]
    [InlineData(EarlyPaymentPolicy.ReduceTerm, 100, 100, 0, 10, 0)]
    public void SimpleOnBalance_EarlyReductionRepricesOnlyPeriodsAfterOriginalEffectiveBoundary(
        EarlyPaymentPolicy policy, decimal firstPrincipal, decimal secondPrincipal, decimal thirdPrincipal,
        decimal secondInterest, decimal thirdInterest)
    {
        var rows = SimpleRows();
        var originalFirst = rows[0];
        var result = CalculateInterestInput(rows, new DateOnly(2026, 10, 15), 100m, policy);

        result.ProposedEarlyPrincipalAmount.Should().Be(100m);
        result.ProposedEarlyPrincipalEffectiveDate.Should().Be(new DateOnly(2026, 11, 1));
        result.ProjectedInstallments.Select(i => i.OutstandingPrincipal)
            .Should().Equal(policy == EarlyPaymentPolicy.ReduceTerm ? [firstPrincipal, secondPrincipal] : [firstPrincipal, secondPrincipal, thirdPrincipal]);
        result.ProjectedInstallments.Select(i => i.OutstandingRegularInterest)
            .Should().Equal(policy == EarlyPaymentPolicy.ReduceTerm ? [30m, secondInterest] : [30m, secondInterest, thirdInterest]);
        rows[0].Should().Be(originalFirst);
    }

    [Fact]
    public void SimpleOnBalance_DuePaymentThenEarlyPrincipalKeepsProtectedInterestAndRepricesNextPeriod()
    {
        var rows = SimpleRows();
        var result = CalculateInterestInput(rows, new DateOnly(2026, 11, 1), 150m, EarlyPaymentPolicy.ReduceInstallment);

        result.ProposedAllocations.Single().ToPrincipal.Should().Be(100m);
        result.ProposedEarlyPrincipalAmount.Should().Be(20m);
        result.ProposedEarlyPrincipalEffectiveDate.Should().Be(new DateOnly(2026, 12, 1));
        result.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(20m, 9m);
    }

    [Fact]
    public void SimpleOnBalance_ReplaySeparatesRecordedPrincipalFromEarlyPrincipal()
    {
        var rows = SimpleRows();
        var recorded = new DynamicLoanRecordedPayment(new DateOnly(2026, 11, 1), new DateTime(2026, 11, 1),
            [new DynamicLoanRecordedAllocation(rows[0].Id, 0m, 30m, 100m)], 1, 1, 20m,
            new DateOnly(2026, 12, 1));
        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 11, 1), rows, [recorded]) with
        {
            Template = LoanTemplate.SimpleOnBalance,
            StatedRate = 0.10m,
            DisbursementDate = new DateOnly(2026, 10, 1),
            Frequency = PaymentFrequency.Monthly,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        });

        result.ResultingPrincipal.Should().Be(180m);
        result.Installments.Sum(i => i.OutstandingPrincipal).Should().Be(180m);
        result.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(90m, 90m);
        result.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(20m, 9m);
    }

    [Fact]
    public void InterestOnly_ReduceInstallmentRepricesFutureInterestAndPreservesBalloonDates()
    {
        var rows = InterestOnlyRows();
        var result = CalculateInterestInput(rows, new DateOnly(2026, 10, 15), 100m,
            EarlyPaymentPolicy.ReduceInstallment, LoanTemplate.InterestOnly);

        result.ProposedEarlyPrincipalAmount.Should().Be(100m);
        result.ProjectedInstallments.Select(i => i.DueDate)
            .Should().Equal(rows.Select(i => i.DueDate));
        result.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(30m, 20m, 20m);
        result.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(0m, 0m, 200m);
        DynamicLoanPaymentCalculator.IsCompatible(LoanTemplate.InterestOnly, EarlyPaymentPolicy.ReduceTerm).Should().BeFalse();
    }

    [Fact]
    public void SimpleOnBalance_ReplayedEarlyPrincipalUsesProtectedInterestAndLeavesZeroPrincipalInterestOpen()
    {
        var rows = SimpleRows();
        var recorded = new DynamicLoanRecordedPayment(new DateOnly(2026, 10, 15), new DateTime(2026, 10, 15), [],
            1, 1, 100m, new DateOnly(2026, 11, 1));
        var replay = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 10, 15), rows, [recorded]) with
        {
            Template = LoanTemplate.SimpleOnBalance,
            StatedRate = 0.10m,
            DisbursementDate = new DateOnly(2026, 10, 1),
            Frequency = PaymentFrequency.Monthly,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        });
        replay.ResultingPrincipal.Should().Be(200m);
        replay.TotalPayoff.Should().Be(230m);
        replay.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(30m, 13.33m, 6.67m);

        var fullPrincipal = recorded with { EarlyPrincipalAmount = 300m };
        var open = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 10, 15), rows, [fullPrincipal]) with
        {
            Template = LoanTemplate.SimpleOnBalance,
            StatedRate = 0.10m,
            DisbursementDate = new DateOnly(2026, 10, 1),
            Frequency = PaymentFrequency.Monthly,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        });
        open.ResultingPrincipal.Should().Be(0m);
        open.TotalPayoff.Should().Be(30m);
        open.ResultingState.Should().NotBe(LoanStatus.Paid);
    }

    [Fact]
    public void SimpleOnBalance_SameBoundaryEventsCombineAndReplayMatchesPreview()
    {
        var rows = SimpleRows();
        var quote = CalculateInterestInput(rows, new DateOnly(2026, 10, 15), 100m, EarlyPaymentPolicy.ReduceInstallment);
        var first = new DynamicLoanRecordedPayment(new DateOnly(2026, 10, 15), new DateTime(2026, 10, 15), [],
            1, 1, 40m, new DateOnly(2026, 11, 1));
        var second = first with { RecordSequence = 2, EarlyPrincipalAmount = 60m };
        var replay = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 10, 15), rows, [first, second]) with
        {
            Template = LoanTemplate.SimpleOnBalance,
            StatedRate = 0.10m,
            DisbursementDate = new DateOnly(2026, 10, 1),
            Frequency = PaymentFrequency.Monthly,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        });

        replay.ResultingPrincipal.Should().Be(200m);
        replay.TotalPayoff.Should().Be(230m);
        replay.ProjectedInstallments.Select(i => i.OutstandingPrincipal)
            .Should().Equal(quote.ProjectedInstallments.Select(i => i.OutstandingPrincipal));
        replay.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(30m, 13.33m, 6.67m);
    }

    [Fact]
    public void SimpleOnBalance_Actual365UsesOriginalMonthEndIntervals()
    {
        var rows = new[]
        {
            new DynamicLoanInstallmentInput(Guid.NewGuid(), 1, new DateOnly(2026, 2, 28), 100m, 8.40m),
            new DynamicLoanInstallmentInput(Guid.NewGuid(), 2, new DateOnly(2026, 3, 31), 100m, 6.20m),
            new DynamicLoanInstallmentInput(Guid.NewGuid(), 3, new DateOnly(2026, 4, 30), 100m, 3m)
        };
        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 15), rows, proposed: 100m) with
        {
            Template = LoanTemplate.SimpleOnBalance,
            StatedRate = 0.365m,
            RateUnit = RateUnit.Annual,
            DayCount = DayCount.Actual365,
            DisbursementDate = new DateOnly(2026, 1, 31),
            Frequency = PaymentFrequency.Monthly,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        });

        result.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(8.40m, 4.13m, 2m);
        result.ProjectedInstallments.Select(i => i.DueDate).Should().Equal(rows.Select(i => i.DueDate));
    }

    [Fact]
    public void InterestOnly_DuePaymentEarlyReductionAndExactProtectedInterestPayoff()
    {
        var rows = InterestOnlyRows();
        var partial = CalculateInterestInput(rows, new DateOnly(2026, 11, 1), 50m,
            EarlyPaymentPolicy.ReduceInstallment, LoanTemplate.InterestOnly);
        partial.ProposedAllocations.Single().ToInterest.Should().Be(30m);
        partial.ProposedEarlyPrincipalAmount.Should().Be(20m);
        partial.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(30m, 28m);
        partial.ProjectedInstallments.Last().OutstandingPrincipal.Should().Be(280m);

        var exact = CalculateInterestInput(rows, new DateOnly(2026, 10, 15), 330m,
            EarlyPaymentPolicy.ReduceInstallment, LoanTemplate.InterestOnly);
        exact.ProposedEarlyPrincipalAmount.Should().Be(300m);
        exact.ProposedAllocations.Single().ToInterest.Should().Be(30m);
        exact.ResultingPrincipal.Should().Be(0m);
        exact.ResultingState.Should().Be(LoanStatus.Paid);
        var abovePayoff = () => CalculateInterestInput(rows, new DateOnly(2026, 10, 15), 330.01m,
            EarlyPaymentPolicy.ReduceInstallment, LoanTemplate.InterestOnly);
        abovePayoff.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void FixedInstallment_EarlyReductionRecomputesOnlyFuturePeriods()
    {
        var term = CalculateFixedReduction(EarlyPaymentPolicy.ReduceTerm);
        term.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(90.63m, 109.37m);
        term.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(30m, 10.94m);

        var installment = CalculateFixedReduction(EarlyPaymentPolicy.ReduceInstallment);
        installment.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(54.08m, 69.49m, 76.43m);
        installment.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(30m, 14.59m, 7.64m);
    }

    private static DynamicLoanPaymentResult CalculateFixedReduction(EarlyPaymentPolicy policy) =>
        DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 10, 15), FixedInstallmentRows(), proposed: 100m) with
        {
            Template = LoanTemplate.FixedInstallment,
            StatedRate = 0.10m,
            DisbursementDate = new DateOnly(2026, 10, 1),
            Frequency = PaymentFrequency.Monthly,
            EarlyPaymentPolicy = policy
        });

    private static DynamicLoanInstallmentInput[] FixedInstallmentRows() =>
    [
        new(Guid.NewGuid(), 1, new DateOnly(2026, 11, 1), 90.63m, 30m),
        new(Guid.NewGuid(), 2, new DateOnly(2026, 12, 1), 99.69m, 20.94m),
        new(Guid.NewGuid(), 3, new DateOnly(2027, 1, 1), 109.68m, 10.97m)
    ];

    private static DynamicLoanPaymentResult CalculateInterestInput(
        DynamicLoanInstallmentInput[] rows, DateOnly asOf, decimal proposed, EarlyPaymentPolicy policy,
        LoanTemplate template = LoanTemplate.SimpleOnBalance) =>
        DynamicLoanPaymentCalculator.Calculate(Input(asOf, rows, proposed: proposed) with
        {
            Template = template,
            StatedRate = 0.10m,
            DisbursementDate = new DateOnly(2026, 10, 1),
            Frequency = PaymentFrequency.Monthly,
            EarlyPaymentPolicy = policy
        });

    private static DynamicLoanInstallmentInput[] SimpleRows() =>
    [
        new(Guid.NewGuid(), 1, new DateOnly(2026, 11, 1), 100m, 30m),
        new(Guid.NewGuid(), 2, new DateOnly(2026, 12, 1), 100m, 20m),
        new(Guid.NewGuid(), 3, new DateOnly(2027, 1, 1), 100m, 10m)
    ];

    private static DynamicLoanInstallmentInput[] InterestOnlyRows() =>
    [
        new(Guid.NewGuid(), 1, new DateOnly(2026, 11, 1), 0m, 30m),
        new(Guid.NewGuid(), 2, new DateOnly(2026, 12, 1), 0m, 30m),
        new(Guid.NewGuid(), 3, new DateOnly(2027, 1, 1), 300m, 30m)
    ];

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment, 66.67, 66.67, 66.66)]
    [InlineData(EarlyPaymentPolicy.ReduceTerm, 100, 100, 0)]
    public void EarlyPrincipal_BeforeFirstDueShapesNoInterestFutureSchedule(
        EarlyPaymentPolicy policy, decimal first, decimal second, decimal third)
    {
        var rows = NoInterestRows();
        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 10, 15), rows, proposed: 100m) with
        {
            Template = LoanTemplate.NoInterest,
            EarlyPaymentPolicy = policy
        });

        result.ProposedEarlyPrincipalAmount.Should().Be(100m);
        result.ProposedEarlyPrincipalEffectiveDate.Should().Be(new DateOnly(2026, 11, 1));
        result.ResultingPrincipal.Should().Be(200m);
        result.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(
            policy == EarlyPaymentPolicy.ReduceTerm ? [first, second] : [first, second, third]);
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment, 75, 75)]
    [InlineData(EarlyPaymentPolicy.ReduceTerm, 100, 50)]
    public void EarlyPrincipal_OnDueDateAllocatesDueObligationBeforeReducingFuturePrincipal(
        EarlyPaymentPolicy policy, decimal first, decimal second)
    {
        var rows = NoInterestRows();
        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 11, 1), rows, proposed: 150m) with
        {
            Template = LoanTemplate.NoInterest,
            EarlyPaymentPolicy = policy
        });

        result.ProposedAllocations.Single().ToPrincipal.Should().Be(100m);
        result.ProposedEarlyPrincipalAmount.Should().Be(50m);
        result.ProposedEarlyPrincipalEffectiveDate.Should().Be(new DateOnly(2026, 12, 1));
        result.ResultingPrincipal.Should().Be(150m);
        result.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(first, second);
    }

    [Fact]
    public void EarlyPrincipal_ReplayAndMultipleEventsCountExactlyOnceAndPreserveOriginalRows()
    {
        var rows = NoInterestRows();
        var eventOne = new DynamicLoanRecordedPayment(new DateOnly(2026, 10, 15), new DateTime(2026, 10, 15), [],
            1, 1, 40m, new DateOnly(2026, 11, 1));
        var eventTwo = new DynamicLoanRecordedPayment(new DateOnly(2026, 10, 15), new DateTime(2026, 10, 15), [],
            2, 1, 60m, new DateOnly(2026, 11, 1));
        var input = Input(new DateOnly(2026, 10, 15), rows, [eventOne, eventTwo]) with
        {
            Template = LoanTemplate.NoInterest,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        };

        var result = DynamicLoanPaymentCalculator.Calculate(input);

        result.ResultingPrincipal.Should().Be(200m);
        result.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(66.67m, 66.67m, 66.66m);
        rows.Select(i => i.ExpectedPrincipal).Should().Equal(100m, 100m, 100m);
        result.HistoricalSnapshots.Should().HaveCount(2);
    }

    [Fact]
    public void EarlyPrincipal_ReplayMatchesQuotedProjectionAndPolicyPayoff()
    {
        var rows = NoInterestRows();
        var quote = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 10, 15), rows, proposed: 100m) with
        {
            Template = LoanTemplate.NoInterest,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        });
        var recorded = new DynamicLoanRecordedPayment(new DateOnly(2026, 10, 15), new DateTime(2026, 10, 15), [],
            1, 1, quote.ProposedEarlyPrincipalAmount, quote.ProposedEarlyPrincipalEffectiveDate);
        var replay = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 10, 15), rows, [recorded]) with
        {
            Template = LoanTemplate.NoInterest,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        });

        replay.ResultingPrincipal.Should().Be(quote.ResultingPrincipal);
        replay.TotalPayoff.Should().Be(quote.ResultingPrincipal);
        replay.ProjectedInstallments.Select(i => i.OutstandingPrincipal)
            .Should().Equal(quote.ProjectedInstallments.Select(i => i.OutstandingPrincipal));
        var overPayoff = () => DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 10, 15), rows,
            [recorded], 200.01m) with
        {
            Template = LoanTemplate.NoInterest,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        });
        overPayoff.Should().Throw<InvalidOperationException>();
        recorded.EarlyPrincipalAmount.Should().Be(100m);
        rows.Select(i => i.ExpectedPrincipal).Should().Equal(100m, 100m, 100m);
    }

    [Fact]
    public void EarlyPrincipal_ReplayKeepsActualAllocationAndEarlyAmountDistinct()
    {
        var rows = NoInterestRows();
        var recorded = new DynamicLoanRecordedPayment(new DateOnly(2026, 11, 1), new DateTime(2026, 11, 1),
            [new DynamicLoanRecordedAllocation(rows[0].Id, 0m, 0m, 100m)], 1, 1, 50m,
            new DateOnly(2026, 12, 1));
        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 11, 1), rows, [recorded]) with
        {
            Template = LoanTemplate.NoInterest,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceTerm
        });

        result.ResultingPrincipal.Should().Be(150m);
        result.Installments[0].OutstandingPrincipal.Should().Be(0m);
        result.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(100m, 50m);
    }

    [Fact]
    public void EarlyPrincipal_ReducesPrincipalUsedForSubsequentLateAccrual()
    {
        var rows = NoInterestRows();
        var recorded = new DynamicLoanRecordedPayment(new DateOnly(2026, 11, 1), new DateTime(2026, 11, 1),
            [new DynamicLoanRecordedAllocation(rows[0].Id, 0m, 0m, 100m)], 1, 1, 50m,
            new DateOnly(2026, 12, 1));
        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 12, 11), rows, [recorded]) with
        {
            Template = LoanTemplate.NoInterest,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        });

        result.Installments.Single(i => i.DueDate == new DateOnly(2026, 12, 1))
            .OutstandingLateInterest.Should().Be(0.75m);
    }

    [Fact]
    public void EarlyPrincipal_FullPayoffClosesAndOneCentAbovePayoffRejectsWithoutMutation()
    {
        var rows = NoInterestRows();
        var full = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 10, 15), rows, proposed: 300m) with
        {
            Template = LoanTemplate.NoInterest,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        });
        full.ResultingPrincipal.Should().Be(0m);
        full.ResultingState.Should().Be(LoanStatus.Paid);
        var over = () => DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 10, 15), rows, proposed: 300.01m) with
        {
            Template = LoanTemplate.NoInterest,
            EarlyPaymentPolicy = EarlyPaymentPolicy.ReduceInstallment
        });
        over.Should().Throw<InvalidOperationException>();
        rows.Select(i => i.ExpectedPrincipal).Should().Equal(100m, 100m, 100m);
    }

    private static DynamicLoanInstallmentInput[] NoInterestRows() =>
    [
        new(Guid.NewGuid(), 1, new DateOnly(2026, 11, 1), 100m, 0m),
        new(Guid.NewGuid(), 2, new DateOnly(2026, 12, 1), 100m, 0m),
        new(Guid.NewGuid(), 3, new DateOnly(2027, 1, 1), 100m, 0m)
    ];

    [Fact]
    public void Quote_AccruesLateOnPrincipalRemainingAfterRecordedPayment()
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 0m);
        var payment = new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 11), new DateTime(2026, 1, 11),
            [new DynamicLoanRecordedAllocation(id, 1m, 0m, 50m)]);

        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 21), [installment], [payment]));

        result.Installments.Single().OutstandingLateInterest.Should().Be(0.50m);
        result.Installments.Single().OutstandingPrincipal.Should().Be(50m);
        result.TotalPayoff.Should().Be(50.50m);
    }

    [Fact]
    public void Quote_IsIndependentOfHowOftenEarlierQuotesWereRequested()
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 0m);
        var initial = Input(new DateOnly(2026, 1, 11), [installment]);

        DynamicLoanPaymentCalculator.Calculate(initial);
        DynamicLoanPaymentCalculator.Calculate(initial with { AsOfDate = new DateOnly(2026, 1, 16) });
        var final = DynamicLoanPaymentCalculator.Calculate(initial with { AsOfDate = new DateOnly(2026, 1, 21) });

        final.Installments.Single().OutstandingLateInterest.Should().Be(2m);
        final.TotalPayoff.Should().Be(102m);
    }

    [Fact]
    public void Quote_RejectsRetroactiveDateButAllowsSameDayRecordedPayment()
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 0m);
        var prior = new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 10), new DateTime(2026, 1, 10),
            [new DynamicLoanRecordedAllocation(id, 0m, 0m, 10m)]);

        var act = () => DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 9), [installment], [prior]));

        act.Should().Throw<InvalidOperationException>();
        DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 10), [installment], [prior])).TotalPayoff
            .Should().Be(90.90m);
    }

    [Fact]
    public void Replay_UsesPrincipalAtEachPaymentBoundaryAndGraceBoundary()
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 0m);
        var first = new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 11), new DateTime(2026, 1, 11),
            [new DynamicLoanRecordedAllocation(id, 0m, 0m, 20m)], 1);
        var second = new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 11), new DateTime(2026, 1, 11),
            [new DynamicLoanRecordedAllocation(id, 0m, 0m, 10m)], 2);
        var input = Input(new DateOnly(2026, 1, 21), [installment], [first, second]) with { GraceDays = 5 };

        var result = DynamicLoanPaymentCalculator.Calculate(input);

        result.Installments.Single().OutstandingPrincipal.Should().Be(70m);
        result.Installments.Single().OutstandingLateInterest.Should().Be(1.20m);
        result.ResultingState.Should().Be(LoanStatus.InArrears);
    }

    [Fact]
    public void Replay_PreservesEarlierHistoricalSnapshotWhenLaterPaymentIsAdded()
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 0m);
        var first = new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 10), new DateTime(2026, 1, 10),
            [new DynamicLoanRecordedAllocation(id, 0m, 0m, 10m)]);
        var next = new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 15), new DateTime(2026, 1, 15),
            [new DynamicLoanRecordedAllocation(id, 0m, 0m, 10m)]);
        var original = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 10), [installment], [first]));
        var extended = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 15), [installment], [first, next]));

        extended.HistoricalSnapshots[0].Should().Be(original.HistoricalSnapshots[0]);
    }

    [Fact]
    public void Replay_LeavesUnpaidLateInterestOpenAfterPrincipalReachesZero()
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 0m);
        var payment = new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 11), new DateTime(2026, 1, 11),
            [new DynamicLoanRecordedAllocation(id, 0m, 0m, 100m)]);

        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 12), [installment], [payment]));

        result.ResultingPrincipal.Should().Be(0m);
        result.Installments.Single().OutstandingLateInterest.Should().Be(1m);
        result.ResultingState.Should().Be(LoanStatus.InArrears);
    }

    [Fact]
    public void Replay_ReportsLegacyTiedEventsAsHistoricallyAmbiguous()
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 0m);
        var timestamp = new DateTime(2026, 1, 10);
        var payments = new[]
        {
            new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 10), timestamp,
                [new DynamicLoanRecordedAllocation(id, 0m, 0m, 10m)]),
            new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 10), timestamp,
                [new DynamicLoanRecordedAllocation(id, 0m, 0m, 10m)])
        };

        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 10), [installment], payments));

        result.HistoricalSnapshots.Should().OnlyContain(s => s.IsAmbiguous && s.RemainingTotal == null);
        result.Installments.Single().OutstandingPrincipal.Should().Be(80m);
    }

    [Theory]
    [InlineData(LoanType.Lent)]
    [InlineData(LoanType.Borrowed)]
    public void Replay_UsesEquivalentDatedMathForBothLoanDirections(LoanType loanType)
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 0m);
        var payment = new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 11), new DateTime(2026, 1, 11),
            [new DynamicLoanRecordedAllocation(id, 1m, 0m, 50m)]);

        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 21), [installment], [payment]) with
        {
            LoanType = loanType
        });

        result.TotalPayoff.Should().Be(50.50m);
    }

    [Fact]
    public void ProposedPayment_AllocatesFutureInstallmentsOldestFirstAndRejectsExcess()
    {
        var firstId = Guid.NewGuid();
        var secondId = Guid.NewGuid();
        var installments = new[]
        {
            new DynamicLoanInstallmentInput(firstId, 1, new DateOnly(2026, 2, 1), 100m, 0m),
            new DynamicLoanInstallmentInput(secondId, 2, new DateOnly(2026, 3, 1), 100m, 0m)
        };

        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 1), installments, proposed: 150m));

        result.ProposedAllocations.Should().HaveCount(2);
        result.ProposedAllocations[0].InstallmentId.Should().Be(firstId);
        result.ProposedAllocations[0].ToPrincipal.Should().Be(100m);
        result.ProposedAllocations[1].ToPrincipal.Should().Be(50m);
        var excess = () => DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 1), installments, proposed: 200.01m));
        excess.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Replay_OrdersSameDayLegacyPaymentsBeforeSequencedPayments()
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 0m);
        var timestamp = new DateTime(2026, 1, 10);
        var payments = new[]
        {
            new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 10), timestamp,
                [new DynamicLoanRecordedAllocation(id, 0m, 0m, 10m)]),
            new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 10), timestamp,
                [new DynamicLoanRecordedAllocation(id, 0m, 0m, 20m)], 1)
        };

        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 10), [installment], payments));

        result.HistoricalSnapshots.Select(snapshot => snapshot.RecordSequence)
            .Should().Equal(null, 1);
    }

    [Fact]
    public void CompatibilityValidation_RecognizesNoInterestReductionPolicies()
    {
        DynamicLoanPaymentCalculator.IsCompatible(LoanTemplate.NoInterest, EarlyPaymentPolicy.ReduceTerm).Should().BeTrue();
        DynamicLoanPaymentCalculator.IsCompatible(LoanTemplate.NoInterest, EarlyPaymentPolicy.ReduceInstallment).Should().BeTrue();
        DynamicLoanPaymentCalculator.IsCompatible(LoanTemplate.SinglePaymentCompound, EarlyPaymentPolicy.ReduceTerm).Should().BeFalse();
        DynamicLoanPaymentCalculator.IsCompatible(LoanTemplate.InterestOnly, EarlyPaymentPolicy.ReduceTerm).Should().BeFalse();
    }

    [Fact]
    public void Replay_LeavesLoanOpenWhenPrincipalIsPaidButInterestRemains()
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 5m);
        var payment = new DynamicLoanRecordedPayment(new DateOnly(2026, 1, 2), new DateTime(2026, 1, 2),
            [new DynamicLoanRecordedAllocation(id, 0m, 0m, 100m)]);

        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 3), [installment], [payment]));

        result.ResultingPrincipal.Should().Be(0m);
        result.ResultingState.Should().Be(LoanStatus.InArrears);
        result.TotalPayoff.Should().Be(5.10m);
    }

    [Theory]
    [InlineData(PaymentAllocationOrder.LateInterestInterestPrincipal, 1, 0.05, 0)]
    [InlineData(PaymentAllocationOrder.InterestPrincipalLateInterest, 0, 1.05, 0)]
    public void ProposedPayment_HonorsConfiguredComponentOrder(
        PaymentAllocationOrder order, decimal late, decimal interest, decimal principal)
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 10m);
        var result = DynamicLoanPaymentCalculator.Calculate(Input(new DateOnly(2026, 1, 11), [installment], proposed: 1.05m)
            with
        { AllocationOrder = order });

        result.ProposedAllocations.Single().ToLateInterest.Should().Be(late);
        result.ProposedAllocations.Single().ToInterest.Should().Be(interest);
        result.ProposedAllocations.Single().ToPrincipal.Should().Be(principal);
    }

    [Fact]
    public void ProposedPayment_RejectsExcessWithoutMutatingOriginalInputs()
    {
        var id = Guid.NewGuid();
        var installment = new DynamicLoanInstallmentInput(id, 1, new DateOnly(2026, 1, 1), 100m, 0m);
        var input = Input(new DateOnly(2026, 1, 1), [installment], proposed: 100.01m);

        var act = () => DynamicLoanPaymentCalculator.Calculate(input);

        act.Should().Throw<InvalidOperationException>();
        installment.ExpectedPrincipal.Should().Be(100m);
        input.RecordedPayments.Should().BeEmpty();
    }
}
