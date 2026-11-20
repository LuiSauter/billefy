using System.Reflection;
using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Lending.Domain.Engine.DynamicPayments;
using Lending.Domain.Entities;
using Lending.Domain.Enums;
using Xunit;

namespace Lending.Domain.Tests;

public class DynamicLoanPaymentAdapterTests
{
    [Theory]
    [InlineData(LoanType.Lent, EarlyPaymentPolicy.AdvanceInstallments, PaymentAllocationOrder.LateInterestInterestPrincipal)]
    [InlineData(LoanType.Borrowed, EarlyPaymentPolicy.AdvanceInstallments, PaymentAllocationOrder.InterestPrincipalLateInterest)]
    [InlineData(LoanType.Lent, EarlyPaymentPolicy.ReduceInstallment, PaymentAllocationOrder.InterestPrincipalLateInterest)]
    [InlineData(LoanType.Borrowed, EarlyPaymentPolicy.ReduceTerm, PaymentAllocationOrder.LateInterestInterestPrincipal)]
    public void Calculate_MatchesDirectTermsAndRecordedHistoryWithoutDoubleCounting(
        LoanType type, EarlyPaymentPolicy policy, PaymentAllocationOrder order)
    {
        var loan = CreateLoan(type, policy, order);
        var paymentDate = new DateTime(2026, 11, 6, 0, 0, 0, DateTimeKind.Utc);
        loan.RecordPayment(25m, paymentDate);
        loan.RecordPayment(15m, paymentDate.AddDays(2));
        var asOf = new DateOnly(2026, 11, 12);
        var originals = loan.Installments.Select(i => (i.Id, i.ExpectedPrincipal, i.ExpectedInterest)).ToArray();
        var cachedPaid = loan.Installments.Sum(i => i.PaidPrincipal);
        cachedPaid.Should().BeGreaterThan(0m);
        var before = LoanPaymentCalculationAdapter.Calculate(loan, asOf);

        var actual = LoanPaymentCalculationAdapter.Calculate(loan, asOf, 30m);
        actual.Should().BeEquivalentTo(DynamicLoanPaymentCalculator.Calculate(DirectInput(loan, asOf, 30m)));
        before.ResultingPrincipal.Should().Be(300m - cachedPaid);
        actual.HistoricalSnapshots.Select(s => s.PaymentId).Should().Equal(loan.Payments.Select(p => (Guid?)p.Id));
        actual.HistoricalSnapshots.Should().Equal(before.HistoricalSnapshots);
        loan.Installments.Select(i => (i.Id, i.ExpectedPrincipal, i.ExpectedInterest)).Should().Equal(originals);
        loan.Installments.Sum(i => i.PaidPrincipal).Should().Be(cachedPaid);
        loan.Payments.Select(p => p.RecordSequence).Should().Equal(1L, 2L);
        loan.Payments.Should().OnlyContain(p => p.CalculationVersion == 1);
    }

    [Fact]
    public void Calculate_PreservesEarlyMetadataSequenceAndPaymentIdentity()
    {
        var loan = CreateLoan(LoanType.Borrowed, EarlyPaymentPolicy.ReduceInstallment);
        var date = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc);
        var legacy = new LoanPayment(Guid.NewGuid(), loan.UserId, loan.Id, null, null,
            Money.Of(30m, loan.Principal.Currency), date, null, date);
        legacy.AddAllocation(loan.Installments.First().Id, 0m, 30m, 0m);
        var early = new LoanPayment(Guid.NewGuid(), loan.UserId, loan.Id, null, null,
            Money.Of(100m, loan.Principal.Currency), date, null, date, 1,
            LoanPaymentCalculationAdapter.CurrentCalculationVersion, 100m, new DateOnly(2026, 11, 1));
        AddRecordedEvents(loan, early, legacy);

        var actual = LoanPaymentCalculationAdapter.Calculate(loan, new DateOnly(2026, 10, 16), 20m);

        LoanPaymentCalculationAdapter.CurrentCalculationVersion.Should().Be(1);
        actual.Should().BeEquivalentTo(DynamicLoanPaymentCalculator.Calculate(DirectInput(loan, new DateOnly(2026, 10, 16), 20m)));
        actual.ResultingPrincipal.Should().Be(180m);
        actual.HistoricalSnapshots.Select(s => s.PaymentId).Should().Equal(legacy.Id, early.Id);
        actual.HistoricalSnapshots.Select(s => s.RecordSequence).Should().Equal(null, 1L);
        actual.ProjectedInstallments.Sum(i => i.OutstandingPrincipal).Should().Be(180m);
        early.EarlyPrincipalAmount.Should().Be(100m);
        legacy.CalculationVersion.Should().BeNull();
    }

    [Fact]
    public void Calculate_PreservesAmbiguousLegacySnapshotsWithoutInventingSequence()
    {
        var loan = CreateLoan();
        var date = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc);
        var first = new LoanPayment(Guid.NewGuid(), loan.UserId, loan.Id, null, null,
            Money.Of(5m, loan.Principal.Currency), date, null, date);
        var second = new LoanPayment(Guid.NewGuid(), loan.UserId, loan.Id, null, null,
            Money.Of(5m, loan.Principal.Currency), date, null, date);
        foreach (var payment in new[] { first, second })
            payment.AddAllocation(loan.Installments.First().Id, 0m, 5m, 0m);
        AddRecordedEvents(loan, first, second);

        var result = LoanPaymentCalculationAdapter.Calculate(loan, new DateOnly(2026, 10, 16));

        result.HistoricalSnapshots.Should().HaveCount(2).And.OnlyContain(s => s.IsAmbiguous && s.RemainingTotal == null);
        result.HistoricalSnapshots.Select(s => s.PaymentId).Should().Equal(first.Id, second.Id);
        loan.Payments.Should().OnlyContain(p => p.RecordSequence == null && p.CalculationVersion == null);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Calculate_PreservesAmountRejection(decimal amount)
    {
        var act = () => LoanPaymentCalculationAdapter.Calculate(CreateLoan(), new DateOnly(2026, 11, 1), amount);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Calculate_PreservesExcessAmountRejection()
    {
        var act = () => LoanPaymentCalculationAdapter.Calculate(CreateLoan(), new DateOnly(2026, 11, 1), 1000m);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Calculate_PreservesChronologicalDateRejection()
    {
        var loan = CreateLoan();
        loan.RecordPayment(10m, new DateTime(2026, 11, 5, 0, 0, 0, DateTimeKind.Utc));
        var act = () => LoanPaymentCalculationAdapter.Calculate(loan, new DateOnly(2026, 11, 4), 10m);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Calculate_RejectsMissingAllocationsRatherThanUsingPaidCaches()
    {
        var loan = CreateLoan();
        loan.RecordPayment(40m, new DateTime(2026, 11, 5, 0, 0, 0, DateTimeKind.Utc));
        var payment = loan.Payments.Single();
        var allocations = (List<PaymentAllocation>)typeof(LoanPayment)
            .GetField("_allocations", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(payment)!;
        allocations.Clear();

        var act = () => LoanPaymentCalculationAdapter.Calculate(loan, new DateOnly(2026, 11, 6));

        act.Should().Throw<InvalidOperationException>().WithMessage("*complete*allocations*");
    }

    private static void AddRecordedEvents(Loan loan, params LoanPayment[] events)
    {
        // Hydrate legacy and sequenced immutable history without recording replacement payments.
        var payments = (List<LoanPayment>)typeof(Loan).GetField("_payments", BindingFlags.Instance | BindingFlags.NonPublic)!
            .GetValue(loan)!;
        payments.AddRange(events);
    }

    private static Loan CreateLoan(LoanType type = LoanType.Lent,
        EarlyPaymentPolicy policy = EarlyPaymentPolicy.AdvanceInstallments,
        PaymentAllocationOrder order = PaymentAllocationOrder.LateInterestInterestPrincipal) =>
        Loan.Create(Guid.NewGuid(), Guid.NewGuid(), null, type, LoanTemplate.SimpleOnBalance,
            Money.Of(300m, Currency.BOB), 1.2m, RateUnit.Annual, DayCount.Actual365,
            PaymentFrequency.Monthly, 3, new DateOnly(2026, 10, 1), graceDays: 2, lateRate: 0.36m,
            allocationOrder: order, earlyPaymentPolicy: policy);

    private static DynamicLoanPaymentInput DirectInput(Loan loan, DateOnly asOf, decimal? amount) => new(
        loan.Installments.Select(i => new DynamicLoanInstallmentInput(i.Id, i.Number, i.DueDate,
            i.ExpectedPrincipal, i.ExpectedInterest)).ToList(),
        loan.Payments.Select(p => new DynamicLoanRecordedPayment(DateOnly.FromDateTime(p.PaymentDate), p.CreatedAt,
            p.Allocations.Select(a => new DynamicLoanRecordedAllocation(a.InstallmentId, a.ToLateInterest,
                a.ToInterest, a.ToPrincipal)).ToList(), p.RecordSequence, p.CalculationVersion,
            p.EarlyPrincipalAmount, p.EarlyPrincipalEffectiveDate, p.Id)).ToList(),
        asOf, amount, loan.LateRate, loan.RateUnit, loan.DayCount, loan.GraceDays, loan.AllocationOrder,
        loan.EarlyPaymentPolicy, loan.Type, loan.Template, loan.InterestRate, loan.DisbursementDate, loan.Frequency);
}
