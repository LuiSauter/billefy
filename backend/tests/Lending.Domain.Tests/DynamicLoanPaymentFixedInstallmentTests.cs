using FluentAssertions;
using Lending.Domain.Engine.DynamicPayments;
using Lending.Domain.Enums;
using Xunit;

namespace Lending.Domain.Tests;

public class DynamicLoanPaymentFixedInstallmentTests
{
    private static readonly DateOnly EarlyDate = new(2026, 10, 15);
    private static readonly DateOnly FirstDue = new(2026, 11, 1);

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceTerm)]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment)]
    public void GoldenProjection_ReplaysExactlyAndLeavesOriginalInputsUntouched(EarlyPaymentPolicy policy)
    {
        var input = Input(policy, proposed: 100m);
        var originals = input.OriginalInstallments.ToArray();
        var quote = DynamicLoanPaymentCalculator.Calculate(input);
        var recorded = Record(input, quote, 1);
        var replay = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = null, RecordedPayments = [recorded] });

        quote.ResultingPrincipal.Should().Be(200m);
        quote.ProposedEarlyPrincipalEffectiveDate.Should().Be(FirstDue);
        replay.ResultingPrincipal.Should().Be(200m);
        replay.TotalPayoff.Should().Be(230m);
        replay.ProjectedInstallments.Should().Equal(quote.ProjectedInstallments);
        replay.Installments.Where(i => i.DueDate <= EarlyDate).Should().BeEmpty();
        input.OriginalInstallments.Should().Equal(originals);
        recorded.EarlyPrincipalAmount.Should().Be(100m);
        quote.ProjectedInstallments.Select(i => i.DueDate).Should().Equal(
            originals.Take(policy == EarlyPaymentPolicy.ReduceTerm ? 2 : 3).Select(i => i.DueDate));
        quote.ProjectedInstallments.Select(i => i.TotalOutstanding).Should().Equal(
            policy == EarlyPaymentPolicy.ReduceTerm ? [120.63m, 120.31m] : [84.08m, 84.08m, 84.07m]);
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceTerm)]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment)]
    public void PendingEvents_AreAppliedOnceWithoutChangingEarlierSnapshots(EarlyPaymentPolicy policy)
    {
        var input = Input(policy, proposed: 40m);
        var firstQuote = DynamicLoanPaymentCalculator.Calculate(input);
        var first = Record(input, firstQuote, 1);
        var firstReplay = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = null, RecordedPayments = [first] });
        var secondInput = input with { AsOfDate = EarlyDate.AddDays(1), ProposedAmount = 60m, RecordedPayments = [first] };
        var secondQuote = DynamicLoanPaymentCalculator.Calculate(secondInput);
        var second = Record(secondInput, secondQuote, 2);
        var replay = DynamicLoanPaymentCalculator.Calculate(secondInput with { ProposedAmount = null, RecordedPayments = [first, second] });
        var combined = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = 100m });

        replay.ResultingPrincipal.Should().Be(200m);
        replay.ProjectedInstallments.Should().Equal(secondQuote.ProjectedInstallments);
        replay.ProjectedInstallments.Should().Equal(combined.ProjectedInstallments);
        replay.HistoricalSnapshots[0].Should().Be(firstReplay.HistoricalSnapshots[0]);
        replay.HistoricalSnapshots[0].RemainingTotal.Should().Be(290m);
        var sameDay = second with { PaymentDate = EarlyDate, CreatedAt = first.CreatedAt };
        var sameDayReplay = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = null, RecordedPayments = [first, sameDay] });
        sameDayReplay.ProjectedInstallments.Should().Equal(combined.ProjectedInstallments);
        sameDayReplay.HistoricalSnapshots[0].Should().Be(firstReplay.HistoricalSnapshots[0]);
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceTerm, 150)]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment, 104.08)]
    public void NextBoundary_PaysRepricedDueComponentsFirstAndPreservesEarlierHistory(EarlyPaymentPolicy policy, decimal payment)
    {
        var input = Input(policy, proposed: 100m);
        var earlyQuote = DynamicLoanPaymentCalculator.Calculate(input);
        var early = Record(input, earlyQuote, 1);
        var originalReplay = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = null, RecordedPayments = [early] });
        var nextInput = input with { AsOfDate = FirstDue, ProposedAmount = payment, RecordedPayments = [early] };
        var quote = DynamicLoanPaymentCalculator.Calculate(nextInput);
        var allocation = quote.ProposedAllocations.Should().ContainSingle().Subject;
        allocation.ToInterest.Should().Be(30m);
        allocation.ToPrincipal.Should().Be(policy == EarlyPaymentPolicy.ReduceTerm ? 90.63m : 54.08m);
        quote.ProposedEarlyPrincipalAmount.Should().Be(policy == EarlyPaymentPolicy.ReduceTerm ? 29.37m : 20m);
        quote.ProposedEarlyPrincipalEffectiveDate.Should().Be(new DateOnly(2026, 12, 1));
        quote.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(
            policy == EarlyPaymentPolicy.ReduceTerm ? [80m] : [59.01m, 66.91m]);
        quote.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(
            policy == EarlyPaymentPolicy.ReduceTerm ? [10.94m] : [14.59m, 6.69m]);

        var next = Record(nextInput, quote, 2);
        var replay = DynamicLoanPaymentCalculator.Calculate(nextInput with { ProposedAmount = null, RecordedPayments = [early, next] });
        replay.ProjectedInstallments.Should().Equal(quote.ProjectedInstallments);
        replay.ResultingPrincipal.Should().Be(quote.ResultingPrincipal);
        replay.HistoricalSnapshots[0].Should().Be(originalReplay.HistoricalSnapshots[0]);
        early.Allocations.Should().BeEmpty();
        next.Allocations.Single().ToInterest.Should().Be(30m);
        var later = DynamicLoanPaymentCalculator.Calculate(nextInput with
        {
            AsOfDate = new DateOnly(2026, 12, 1),
            ProposedAmount = null,
            RecordedPayments = [early, next]
        });
        later.Installments.Single(i => i.DueDate == FirstDue).TotalOutstanding.Should().Be(0m);
        later.Installments.Single(i => i.DueDate == new DateOnly(2026, 12, 1)).OutstandingRegularInterest
            .Should().Be(policy == EarlyPaymentPolicy.ReduceTerm ? 10.94m : 14.59m);
        later.HistoricalSnapshots.Should().Equal(replay.HistoricalSnapshots);
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceTerm)]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment)]
    public void OriginalDueBoundary_AllocatesDueBeforeEarlyAndProtectsNextPeriod(EarlyPaymentPolicy policy)
    {
        var input = Input(policy, FirstDue, 150m);
        var result = DynamicLoanPaymentCalculator.Calculate(input);
        result.ProposedAllocations.Single().ToInterest.Should().Be(30m);
        result.ProposedAllocations.Single().ToPrincipal.Should().Be(90.63m);
        result.ProposedEarlyPrincipalAmount.Should().Be(29.37m);
        result.ProposedEarlyPrincipalEffectiveDate.Should().Be(new DateOnly(2026, 12, 1));
        result.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(
            policy == EarlyPaymentPolicy.ReduceTerm ? [99.69m, 80.31m] : [84.31m, 95.69m]);
        result.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(
            20.94m, policy == EarlyPaymentPolicy.ReduceTerm ? 8.03m : 9.57m);
        var replay = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = null, RecordedPayments = [Record(input, result, 1)] });
        replay.ProjectedInstallments.Should().Equal(result.ProjectedInstallments);
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceTerm)]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment)]
    public void ExactPayoff_ClosesWithoutRestoringPaidInterestAndRejectsOneCentExcess(EarlyPaymentPolicy policy)
    {
        var input = Input(policy, proposed: 330m);
        var quote = DynamicLoanPaymentCalculator.Calculate(input);
        quote.TotalPayoff.Should().Be(330m);
        quote.ProposedEarlyPrincipalAmount.Should().Be(300m);
        quote.ProposedAllocations.Single().ToInterest.Should().Be(30m);
        quote.ResultingPrincipal.Should().Be(0m);
        quote.ResultingState.Should().Be(LoanStatus.Paid);
        quote.ProjectedInstallments.Sum(i => i.TotalOutstanding).Should().Be(0m);
        var replay = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = null, RecordedPayments = [Record(input, quote, 1)] });
        replay.TotalPayoff.Should().Be(0m);
        replay.ResultingState.Should().Be(LoanStatus.Paid);
        replay.ProjectedInstallments.Sum(i => i.TotalOutstanding).Should().Be(0m);
        var excess = () => DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = 330.01m });
        excess.Should().Throw<InvalidOperationException>();

        var principalOnly = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = 300m });
        principalOnly.ResultingPrincipal.Should().Be(0m);
        principalOnly.ResultingState.Should().Be(LoanStatus.Active);
        principalOnly.ProjectedInstallments.Sum(i => i.OutstandingRegularInterest).Should().Be(30m);
    }

    [Theory]
    [InlineData(299, 0.48, 0.52, 0.10, 0.05)]
    [InlineData(299.97, 0.02, 0.01, 0, 0)]
    public void ProtectedInterestLargerThanLevelAmount_UsesInterestOnlyFirstThenNormalAnnuity(
        decimal early, decimal secondPrincipal, decimal lastPrincipal, decimal secondInterest, decimal lastInterest)
    {
        var input = Input(EarlyPaymentPolicy.ReduceInstallment, proposed: early);
        var quote = DynamicLoanPaymentCalculator.Calculate(input);
        quote.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(0m, secondPrincipal, lastPrincipal);
        quote.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(30m, secondInterest, lastInterest);
        quote.ProjectedInstallments.Should().OnlyContain(i => i.OutstandingPrincipal >= 0m && i.OutstandingRegularInterest >= 0m);
        quote.ProjectedInstallments.Sum(i => i.OutstandingPrincipal).Should().Be(300m - early);
        var replay = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = null, RecordedPayments = [Record(input, quote, 1)] });
        replay.ProjectedInstallments.Should().Equal(quote.ProjectedInstallments);
    }

    [Fact]
    public void AlreadyPaidProtectedInterest_IsKnownZeroNotNormalFirstPeriodInterest()
    {
        var input = Input(EarlyPaymentPolicy.ReduceInstallment, proposed: 100m);
        var paidInterest = new DynamicLoanRecordedPayment(EarlyDate.AddDays(-1), new DateTime(2026, 10, 14),
            [new(input.OriginalInstallments[0].Id, 0m, 30m, 0m)], 1);
        input = input with { RecordedPayments = [paidInterest] };
        var quote = DynamicLoanPaymentCalculator.Calculate(input);
        quote.TotalPayoff.Should().Be(300m);
        quote.ProjectedInstallments.Select(i => i.OutstandingPrincipal).Should().Equal(73.11m, 60.42m, 66.47m);
        quote.ProjectedInstallments.Select(i => i.OutstandingRegularInterest).Should().Equal(0m, 12.69m, 6.65m);
        var replay = DynamicLoanPaymentCalculator.Calculate(input with
        {
            ProposedAmount = null,
            RecordedPayments = [paidInterest, Record(input, quote, 2)]
        });
        replay.ProjectedInstallments.Should().Equal(quote.ProjectedInstallments);
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceTerm)]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment)]
    public void ZeroRate_MatchesNoInterestIncludingLastRounding(EarlyPaymentPolicy policy)
    {
        var input = Input(policy, proposed: 100m) with
        {
            StatedRate = 0m,
            OriginalInstallments = Rows().Select(i => i with { ExpectedPrincipal = 100m, ExpectedInterest = 0m }).ToArray()
        };
        var fixedResult = DynamicLoanPaymentCalculator.Calculate(input);
        var noInterest = DynamicLoanPaymentCalculator.Calculate(input with { Template = LoanTemplate.NoInterest });
        fixedResult.ProjectedInstallments.Should().Equal(noInterest.ProjectedInstallments);
        fixedResult.ResultingPrincipal.Should().Be(noInterest.ResultingPrincipal);
        var replay = DynamicLoanPaymentCalculator.Calculate(input with
        {
            ProposedAmount = null,
            RecordedPayments = [Record(input, fixedResult, 1)]
        });
        replay.ProjectedInstallments.Should().Equal(fixedResult.ProjectedInstallments);
    }

    [Theory]
    [InlineData(LoanTemplate.SimpleOnBalance, EarlyPaymentPolicy.ReduceTerm, 150, 100, 10)]
    [InlineData(LoanTemplate.SimpleOnBalance, EarlyPaymentPolicy.ReduceInstallment, 116.67, 66.67, 13.33)]
    [InlineData(LoanTemplate.InterestOnly, EarlyPaymentPolicy.ReduceInstallment, 50, 0, 20)]
    public void SharedReplay_KeepsPreviouslyRepricedInterestEarnedAtLaterBoundaries(
        LoanTemplate template, EarlyPaymentPolicy policy, decimal payment, decimal duePrincipal, decimal protectedInterest)
    {
        var input = Input(policy, proposed: 100m) with { Template = template };
        input = input with
        {
            OriginalInstallments = input.OriginalInstallments.Select((i, n) => i with
            {
                ExpectedPrincipal = template == LoanTemplate.InterestOnly ? (n == 2 ? 300m : 0m) : 100m,
                ExpectedInterest = template == LoanTemplate.InterestOnly ? 30m : 30m - 10m * n
            }).ToArray()
        };
        var first = Record(input, DynamicLoanPaymentCalculator.Calculate(input), 1);
        var nextInput = input with { AsOfDate = FirstDue, ProposedAmount = payment, RecordedPayments = [first] };
        var quote = DynamicLoanPaymentCalculator.Calculate(nextInput);
        quote.ProposedAllocations.Single().ToPrincipal.Should().Be(duePrincipal);
        quote.ProposedEarlyPrincipalAmount.Should().Be(20m);
        quote.ProjectedInstallments[0].OutstandingRegularInterest.Should().Be(protectedInterest);
        var second = Record(nextInput, quote, 2);
        var replay = DynamicLoanPaymentCalculator.Calculate(nextInput with { ProposedAmount = null, RecordedPayments = [first, second] });
        replay.ProjectedInstallments.Should().Equal(quote.ProjectedInstallments);
        var later = DynamicLoanPaymentCalculator.Calculate(nextInput with
        {
            AsOfDate = new DateOnly(2026, 12, 1),
            ProposedAmount = null,
            RecordedPayments = [first, second]
        });
        later.Installments.Single(i => i.DueDate == new DateOnly(2026, 12, 1)).OutstandingRegularInterest.Should().Be(protectedInterest);
        later.HistoricalSnapshots.Should().Equal(replay.HistoricalSnapshots);
    }

    [Theory]
    [InlineData(LoanTemplate.NoInterest)]
    [InlineData(LoanTemplate.SimpleOnBalance)]
    public void PendingReductionReplay_RetainsOriginalDatesWithZeroPrincipalPortions(LoanTemplate template)
    {
        var input = Input(EarlyPaymentPolicy.ReduceInstallment, proposed: 299.98m) with { Template = template };
        input = input with
        {
            OriginalInstallments = input.OriginalInstallments.Select((i, n) => i with
            {
                ExpectedPrincipal = 100m,
                ExpectedInterest = template == LoanTemplate.NoInterest ? 0m : 30m - 10m * n
            }).ToArray()
        };
        var first = Record(input, DynamicLoanPaymentCalculator.Calculate(input), 1);
        var nextInput = input with { ProposedAmount = 0.01m, RecordedPayments = [first] };
        var nextQuote = DynamicLoanPaymentCalculator.Calculate(nextInput);
        var second = Record(nextInput, nextQuote, 2);
        var replay = DynamicLoanPaymentCalculator.Calculate(input with
        {
            ProposedAmount = null,
            RecordedPayments = [first, second]
        });
        var combined = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = 299.99m });
        replay.ResultingPrincipal.Should().Be(0.01m);
        replay.ProjectedInstallments.Should().Equal(combined.ProjectedInstallments);
        replay.ProjectedInstallments.Should().Equal(nextQuote.ProjectedInstallments);
    }

    [Fact]
    public void TiedLegacyHistory_RemainsAmbiguousWhenSequencedEventIsAppended()
    {
        var input = Input(EarlyPaymentPolicy.ReduceInstallment);
        var first = new DynamicLoanRecordedPayment(EarlyDate, EarlyDate.ToDateTime(TimeOnly.MinValue),
            [new(input.OriginalInstallments[0].Id, 0m, 0m, 10m)], PaymentId: Guid.NewGuid());
        var second = first with { PaymentId = Guid.NewGuid() };
        input = input with { RecordedPayments = [first, second] };
        var original = DynamicLoanPaymentCalculator.Calculate(input);
        var quote = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = 100m });
        var sequenced = Record(input, quote, 1);
        var extended = DynamicLoanPaymentCalculator.Calculate(input with { RecordedPayments = [first, second, sequenced] });
        original.HistoricalSnapshots.Should().OnlyContain(s => s.IsAmbiguous && s.RemainingTotal == null);
        extended.HistoricalSnapshots.Take(2).Should().Equal(original.HistoricalSnapshots);
        extended.HistoricalSnapshots[^1].IsAmbiguous.Should().BeFalse();
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceTerm)]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment)]
    public void PreviouslySettledFutureRow_IsNeverReopenedByAnEarlyReduction(EarlyPaymentPolicy policy)
    {
        var input = Input(policy, proposed: 100m);
        var first = input.OriginalInstallments[0];
        var settled = new DynamicLoanRecordedPayment(EarlyDate.AddDays(-1), new DateTime(2026, 10, 14),
            [new(first.Id, 0m, 30m, 90.63m)], 1);
        input = input with { RecordedPayments = [settled] };
        var quote = DynamicLoanPaymentCalculator.Calculate(input);
        var firstProjection = quote.ProjectedInstallments.FirstOrDefault(i => i.InstallmentId == first.Id);
        (firstProjection?.TotalOutstanding ?? 0m).Should().Be(0m);
        quote.ProjectedInstallments.Where(i => i.OutstandingPrincipal > 0m).Select(i => i.OutstandingPrincipal)
            .Should().Equal(policy == EarlyPaymentPolicy.ReduceTerm ? [109.37m] : [52.08m, 57.29m]);
        var replay = DynamicLoanPaymentCalculator.Calculate(input with
        {
            ProposedAmount = null,
            RecordedPayments = [settled, Record(input, quote, 2)]
        });
        replay.Installments.Single(i => i.InstallmentId == first.Id).TotalOutstanding.Should().Be(0m);
        replay.ProjectedInstallments.Should().Equal(quote.ProjectedInstallments);
        settled.Allocations.Single().ToPrincipal.Should().Be(90.63m);
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceTerm, 0.91)]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment, 0.54)]
    public void PayoffAfterEarlyReduction_IncludesDatedLateInterestAndProtectsRepricedInterest(
        EarlyPaymentPolicy policy, decimal late)
    {
        var input = Input(policy, proposed: 100m) with { LateRate = 0.03m };
        var earlyQuote = DynamicLoanPaymentCalculator.Calculate(input);
        var early = Record(input, earlyQuote, 1);
        input = input with { AsOfDate = FirstDue.AddDays(10), RecordedPayments = [early], ProposedAmount = null };
        var outstanding = DynamicLoanPaymentCalculator.Calculate(input);
        var nextInterest = policy == EarlyPaymentPolicy.ReduceTerm ? 10.94m : 14.59m;
        outstanding.Installments.Single(i => i.DueDate == FirstDue).OutstandingLateInterest.Should().Be(late);
        outstanding.TotalPayoff.Should().Be(200m + 30m + nextInterest + late);
        var exact = DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = outstanding.TotalPayoff });
        exact.ResultingState.Should().Be(LoanStatus.Paid);
        exact.ProjectedInstallments.Sum(i => i.TotalOutstanding).Should().Be(0m);
        var closedReplay = DynamicLoanPaymentCalculator.Calculate(input with
        {
            RecordedPayments = [early, Record(input, exact, 2)]
        });
        closedReplay.TotalPayoff.Should().Be(0m);
        closedReplay.ResultingState.Should().Be(LoanStatus.Paid);
        var over = () => DynamicLoanPaymentCalculator.Calculate(input with { ProposedAmount = outstanding.TotalPayoff + 0.01m });
        over.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceTerm)]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment)]
    public void SingleRemainingDate_AbsorbsAllPrincipalAndProtectedInterest(EarlyPaymentPolicy policy)
    {
        var input = Input(policy, proposed: 299.99m);
        input = input with { OriginalInstallments = [input.OriginalInstallments[0] with { ExpectedPrincipal = 300m }] };
        var quote = DynamicLoanPaymentCalculator.Calculate(input);
        quote.ProjectedInstallments.Single().OutstandingPrincipal.Should().Be(0.01m);
        quote.ProjectedInstallments.Single().OutstandingRegularInterest.Should().Be(30m);
        quote.ProjectedInstallments.Single().TotalOutstanding.Should().Be(30.01m);
        var replay = DynamicLoanPaymentCalculator.Calculate(input with
        {
            ProposedAmount = null,
            RecordedPayments = [Record(input, quote, 1)]
        });
        replay.ProjectedInstallments.Should().Equal(quote.ProjectedInstallments);
    }

    public static IEnumerable<object[]> CompatibilityCases() =>
        from template in Enum.GetValues<LoanTemplate>()
        from policy in Enum.GetValues<EarlyPaymentPolicy>()
        select new object[] { template, policy, template switch
        {
            LoanTemplate.NoInterest or LoanTemplate.SimpleOnBalance or LoanTemplate.FixedInstallment => true,
            LoanTemplate.InterestOnly => policy != EarlyPaymentPolicy.ReduceTerm,
            _ => policy == EarlyPaymentPolicy.AdvanceInstallments
        } };

    [Theory]
    [MemberData(nameof(CompatibilityCases))]
    public void CompatibilityMatrix_EnforcesEveryTemplateAndPolicyAndKeepsAdvanceUnchanged(
        LoanTemplate template, EarlyPaymentPolicy policy, bool compatible)
    {
        var input = Input(policy, proposed: 10m) with { Template = template };
        input = input with
        {
            OriginalInstallments = template switch
            {
                LoanTemplate.NoInterest => input.OriginalInstallments.Select(i => i with { ExpectedPrincipal = 100m, ExpectedInterest = 0m }).ToArray(),
                LoanTemplate.SimpleOnBalance => input.OriginalInstallments.Select((i, n) => i with { ExpectedPrincipal = 100m, ExpectedInterest = 30m - 10m * n }).ToArray(),
                LoanTemplate.FlatOnInitialCapital => input.OriginalInstallments.Select(i => i with { ExpectedPrincipal = 100m, ExpectedInterest = 30m }).ToArray(),
                LoanTemplate.InterestOnly => input.OriginalInstallments.Select((i, n) => i with { ExpectedPrincipal = n == 2 ? 300m : 0m, ExpectedInterest = 30m }).ToArray(),
                LoanTemplate.SinglePaymentCompound => [input.OriginalInstallments[^1] with { ExpectedPrincipal = 300m, ExpectedInterest = 99.30m }],
                _ => input.OriginalInstallments
            }
        };
        DynamicLoanPaymentCalculator.IsCompatible(template, policy).Should().Be(compatible);
        var calculate = () => DynamicLoanPaymentCalculator.Calculate(input);
        if (!compatible)
        {
            calculate.Should().Throw<ArgumentException>();
            return;
        }
        var result = calculate();
        if (policy == EarlyPaymentPolicy.AdvanceInstallments)
        {
            var legacy = DynamicLoanPaymentCalculator.Calculate(input with { Template = null });
            result.ProposedAllocations.Should().Equal(legacy.ProposedAllocations);
            result.ProjectedInstallments.Should().Equal(legacy.ProjectedInstallments);
            result.TotalPayoff.Should().Be(legacy.TotalPayoff);
            result.ProposedEarlyPrincipalAmount.Should().Be(0m);
        }
    }

    private static DynamicLoanPaymentInput Input(EarlyPaymentPolicy policy, DateOnly? date = null, decimal? proposed = null) =>
        new(Rows(), [], date ?? EarlyDate, proposed, null, RateUnit.Monthly, DayCount.Thirty360, 0,
            PaymentAllocationOrder.LateInterestInterestPrincipal, policy, LoanType.Lent,
            LoanTemplate.FixedInstallment, 0.10m, new DateOnly(2026, 10, 1), PaymentFrequency.Monthly);

    private static DynamicLoanInstallmentInput[] Rows() =>
    [
        new(Guid.NewGuid(), 1, FirstDue, 90.63m, 30m),
        new(Guid.NewGuid(), 2, new DateOnly(2026, 12, 1), 99.69m, 20.94m),
        new(Guid.NewGuid(), 3, new DateOnly(2027, 1, 1), 109.68m, 10.97m)
    ];

    private static DynamicLoanRecordedPayment Record(DynamicLoanPaymentInput input, DynamicLoanPaymentResult quote, long sequence) =>
        new(input.AsOfDate, input.AsOfDate.ToDateTime(TimeOnly.MinValue),
            quote.ProposedAllocations.Select(a => new DynamicLoanRecordedAllocation(
                a.InstallmentId, a.ToLateInterest, a.ToInterest, a.ToPrincipal)).ToArray(), sequence, 1,
            quote.ProposedEarlyPrincipalAmount > 0m ? quote.ProposedEarlyPrincipalAmount : null,
            quote.ProposedEarlyPrincipalEffectiveDate, Guid.NewGuid());
}
