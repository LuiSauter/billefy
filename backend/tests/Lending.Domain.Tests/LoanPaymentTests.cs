using System.Reflection;
using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Lending.Domain.Engine.DynamicPayments;
using Lending.Domain.Entities;
using Lending.Domain.Enums;
using Xunit;

namespace Lending.Domain.Tests;

public class LoanPaymentTests
{
    [Fact]
    public void RecordPayment_RejectsAmountGreaterThanOutstandingScheduledBalance()
    {
        var loan = Loan.Create(
            Guid.NewGuid(), Guid.NewGuid(), null, LoanType.Lent, LoanTemplate.NoInterest,
            Money.Of(100m, Currency.USD), 0m, RateUnit.Monthly, DayCount.Thirty360,
            PaymentFrequency.Monthly, 1, new DateOnly(2026, 1, 1));

        var act = () => loan.RecordPayment(101m, new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc));

        act.Should().Throw<InvalidOperationException>();
        loan.Payments.Should().BeEmpty();
        loan.RemainingPrincipal.Should().Be(100m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void RecordPayment_RejectsNonPositiveAmountWithoutMutation(decimal amount)
    {
        var loan = CreateLoan();

        var act = () => loan.RecordPayment(amount, PaymentDate(15));

        act.Should().Throw<ArgumentOutOfRangeException>();
        loan.Payments.Should().BeEmpty();
        loan.RemainingPrincipal.Should().Be(300m);
    }

    [Theory]
    [InlineData(LoanStatus.PendingAcceptance)]
    [InlineData(LoanStatus.Paid)]
    [InlineData(LoanStatus.Forgiven)]
    [InlineData(LoanStatus.Cancelled)]
    public void RecordPayment_RejectsInactiveStatusWithoutMutation(LoanStatus status)
    {
        var loan = CreateLoan(activateImmediately: status != LoanStatus.PendingAcceptance);
        if (status == LoanStatus.Paid) loan.RecordPayment(300m, PaymentDate(15));
        if (status == LoanStatus.Forgiven) loan.Forgive(PaymentDate(15));
        if (status == LoanStatus.Cancelled) loan.Cancel(PaymentDate(15));
        var previousPayments = loan.Payments.ToArray();
        var previousPrincipal = loan.RemainingPrincipal;
        var previousClosedAt = loan.ClosedAt;

        var act = () => loan.RecordPayment(10m, PaymentDate(16));

        act.Should().Throw<InvalidOperationException>();
        loan.Payments.Should().Equal(previousPayments);
        loan.RemainingPrincipal.Should().Be(previousPrincipal);
        loan.ClosedAt.Should().Be(previousClosedAt);
        loan.Status.Should().Be(status);
    }

    [Fact]
    public void RecordPayment_AssignsSequentialProvenanceAndLeavesOrdinaryEarlyMetadataNull()
    {
        var loan = CreateLoan();
        var accountId = Guid.NewGuid();
        var transactionId = Guid.NewGuid();

        loan.RecordPayment(25m, PaymentDate(15), accountId, transactionId, " repayment ");
        loan.RecordPayment(15m, PaymentDate(15));
        loan.RecordPayment(10m, PaymentDate(16));

        loan.Payments.Select(p => p.RecordSequence).Should().Equal(1L, 2L, 3L);
        loan.Payments.Should().OnlyContain(p => p.CalculationVersion == 1
            && p.EarlyPrincipalAmount == null && p.EarlyPrincipalEffectiveDate == null);
        var first = loan.Payments.First();
        first.AccountId.Should().Be(accountId);
        first.LedgerTransactionId.Should().Be(transactionId);
        first.Note.Should().Be("repayment");
        first.Amount.Should().Be(Money.Of(25m, Currency.USD));
        loan.RemainingPrincipal.Should().Be(250m);
    }

    [Theory]
    [InlineData(null, 1L)]
    [InlineData(7L, 8L)]
    public void RecordPayment_AssignsMaxNonNullSequenceWithoutBackfillingLegacy(long? sequence, long nextSequence)
    {
        var loan = CreateLoan();
        var legacy = AddRecordedPayment(loan, 10m, PaymentDate(13), null);
        var other = AddRecordedPayment(loan, 20m, PaymentDate(14), sequence);
        var originals = loan.Payments.Select(p => (p.Id, p.RecordSequence, p.CalculationVersion)).ToArray();

        loan.RecordPayment(25m, PaymentDate(15));
        loan.RecordPayment(15m, PaymentDate(15));

        loan.Payments.Take(2).Select(p => (p.Id, p.RecordSequence, p.CalculationVersion)).Should().Equal(originals);
        loan.Payments.Skip(2).Select(p => p.RecordSequence).Should().Equal(nextSequence, nextSequence + 1L);
        loan.Payments.Skip(2).Should().OnlyContain(p => p.CalculationVersion == 1);
        legacy.RecordSequence.Should().BeNull();
        other.RecordSequence.Should().Be(sequence);
        loan.RemainingPrincipal.Should().Be(230m);
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment, 15, 100, 100, 2)]
    [InlineData(EarlyPaymentPolicy.ReduceTerm, 15, 100, 100, 2)]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment, 32, 150, 50, 3)]
    [InlineData(EarlyPaymentPolicy.ReduceTerm, 32, 150, 50, 3)]
    public void RecordPayment_PersistsEarlyPrincipalSeparatelyWithoutRewritingOriginalSchedule(
        EarlyPaymentPolicy policy, int dayOffset, decimal amount, decimal earlyAmount, int effectiveMonth)
    {
        var loan = CreateLoan(policy);
        var date = PaymentDate(dayOffset);
        var originals = loan.Installments.Select(i => (i.Id, i.ExpectedPrincipal, i.ExpectedInterest, i.ExpectedTotal)).ToArray();
        var calculation = LoanPaymentCalculationAdapter.Calculate(loan, DateOnly.FromDateTime(date), amount);

        var result = loan.RecordPayment(amount, date);

        var payment = loan.Payments.Single();
        payment.RecordSequence.Should().Be(1L);
        payment.CalculationVersion.Should().Be(1);
        payment.EarlyPrincipalAmount.Should().Be(earlyAmount);
        payment.EarlyPrincipalEffectiveDate.Should().Be(new DateOnly(2026, effectiveMonth, 1));
        result.Allocations.Should().Equal(calculation.ProposedAllocations);
        result.RemainingUnallocatedAmount.Should().Be(0m);
        payment.Allocations.Select(a => (a.InstallmentId, a.ToLateInterest, a.ToInterest, a.ToPrincipal)).Should()
            .Equal(result.Allocations.Select(a => (a.InstallmentId, a.ToLateInterest, a.ToInterest, a.ToPrincipal)));
        payment.Allocations.Sum(a => a.ToLateInterest + a.ToInterest + a.ToPrincipal).Should().Be(amount - earlyAmount);
        loan.Installments.Sum(i => i.PaidPrincipal).Should().Be(amount - earlyAmount);
        loan.Installments.Select(i => (i.Id, i.ExpectedPrincipal, i.ExpectedInterest, i.ExpectedTotal)).Should().Equal(originals);
        loan.RemainingPrincipal.Should().Be(300m - amount);
        var replay = LoanPaymentCalculationAdapter.Calculate(loan, DateOnly.FromDateTime(date));
        replay.ResultingPrincipal.Should().Be(loan.RemainingPrincipal);
        replay.ProjectedInstallments.Should().Equal(calculation.ProjectedInstallments);
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.AdvanceInstallments)]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment)]
    [InlineData(EarlyPaymentPolicy.ReduceTerm)]
    public void RecordPayment_ExactPayoffClosesLoanAtPaymentDate(EarlyPaymentPolicy policy)
    {
        var loan = CreateLoan(policy);
        loan.RecordPayment(100m, PaymentDate(15));
        loan.ClosedAt.Should().BeNull();

        var result = loan.RecordPayment(200m, PaymentDate(16));

        result.RemainingUnallocatedAmount.Should().Be(0m);
        loan.RemainingPrincipal.Should().Be(0m);
        loan.Status.Should().Be(LoanStatus.Paid);
        loan.ClosedAt.Should().Be(PaymentDate(16));
        LoanPaymentCalculationAdapter.Calculate(loan, new DateOnly(2026, 1, 16)).TotalPayoff.Should().Be(0m);
    }

    [Theory]
    [InlineData(EarlyPaymentPolicy.ReduceInstallment)]
    [InlineData(EarlyPaymentPolicy.ReduceTerm)]
    public void RecordPayment_ZeroPrincipalDoesNotCloseProtectedRegularInterest(EarlyPaymentPolicy policy)
    {
        var loan = CreateLoan(policy, LoanTemplate.SimpleOnBalance, rate: 0.1m);

        loan.RecordPayment(300m, PaymentDate(15));

        loan.RemainingPrincipal.Should().Be(0m);
        loan.Status.Should().Be(LoanStatus.Active);
        loan.ClosedAt.Should().BeNull();
        loan.Payments.Single().EarlyPrincipalAmount.Should().Be(300m);
        LoanPaymentCalculationAdapter.Calculate(loan, new DateOnly(2026, 1, 15)).TotalPayoff.Should().Be(30m);

        loan.RecordPayment(30m, PaymentDate(32));

        loan.Status.Should().Be(LoanStatus.Paid);
        loan.ClosedAt.Should().Be(PaymentDate(32));
        loan.Payments.Last().Allocations.Single().ToInterest.Should().Be(30m);
        loan.Payments.Last().EarlyPrincipalAmount.Should().BeNull();
    }

    [Fact]
    public void RecordPayment_UnpaidOverdueBalanceSetsArrearsAndClearingItRestoresActive()
    {
        var loan = CreateLoan();

        loan.RecordPayment(25m, PaymentDate(42));

        loan.Status.Should().Be(LoanStatus.InArrears);
        loan.RemainingPrincipal.Should().Be(275m);
        loan.ClosedAt.Should().BeNull();

        loan.RecordPayment(75m, PaymentDate(42));

        loan.Status.Should().Be(LoanStatus.Active);
        loan.RemainingPrincipal.Should().Be(200m);
        loan.ClosedAt.Should().BeNull();
    }

    [Fact]
    public void RecordPayment_ZeroPrincipalDoesNotCloseUnpaidLateInterest()
    {
        var loan = Loan.Create(Guid.NewGuid(), Guid.NewGuid(), null, LoanType.Lent, LoanTemplate.NoInterest,
            Money.Of(100m, Currency.USD), 0m, RateUnit.Monthly, DayCount.Thirty360,
            PaymentFrequency.Monthly, 1, new DateOnly(2026, 1, 1), lateRate: 0.03m,
            allocationOrder: PaymentAllocationOrder.InterestPrincipalLateInterest);

        loan.RecordPayment(100m, PaymentDate(42));

        loan.RemainingPrincipal.Should().Be(0m);
        loan.Status.Should().Be(LoanStatus.InArrears);
        loan.ClosedAt.Should().BeNull();
        loan.Installments.Single().Status.Should().Be(InstallmentStatus.Paid);

        loan.RecordPayment(1m, PaymentDate(43));

        loan.Payments.Last().Allocations.Single().ToLateInterest.Should().Be(1m);
        loan.Status.Should().Be(LoanStatus.Paid);
        loan.ClosedAt.Should().Be(PaymentDate(43));
    }

    [Fact]
    public void RecordPayment_ReplaysDatedPrincipalChangesForLateInterest()
    {
        var loan = CreateLoan(lateRate: 0.03m);
        loan.RecordPayment(50m, PaymentDate(42));
        var first = loan.Payments.Single().Allocations.Single();
        first.ToLateInterest.Should().Be(1m);
        first.ToPrincipal.Should().Be(49m);

        var result = loan.RecordPayment(25m, PaymentDate(52));

        result.Allocations.Single().ToLateInterest.Should().Be(0.51m);
        result.Allocations.Single().ToPrincipal.Should().Be(24.49m);
        loan.RemainingPrincipal.Should().Be(226.51m);
        first.ToLateInterest.Should().Be(1m);
        first.ToPrincipal.Should().Be(49m);
        loan.Status.Should().Be(LoanStatus.InArrears);
    }

    [Fact]
    public void RecordPayment_RejectsEarlierCalendarDateWithoutMutationButAllowsSameDay()
    {
        var loan = CreateLoan();
        loan.RecordPayment(10m, PaymentDate(15).AddHours(12));
        var paid = loan.Installments.Select(i => (i.PaidPrincipal, i.PaidInterest, i.PaidLateInterest)).ToArray();

        var act = () => loan.RecordPayment(10m, PaymentDate(14));

        act.Should().Throw<InvalidOperationException>().WithMessage("*precede*last recorded payment*");
        loan.Payments.Should().ContainSingle();
        loan.RemainingPrincipal.Should().Be(290m);
        loan.Installments.Select(i => (i.PaidPrincipal, i.PaidInterest, i.PaidLateInterest)).Should().Equal(paid);

        loan.RecordPayment(10m, PaymentDate(15));

        loan.Payments.Select(p => p.RecordSequence).Should().Equal(1L, 2L);
        loan.RemainingPrincipal.Should().Be(280m);
    }

    private static Loan CreateLoan(EarlyPaymentPolicy policy = EarlyPaymentPolicy.AdvanceInstallments,
        LoanTemplate template = LoanTemplate.NoInterest, decimal rate = 0m, decimal? lateRate = null,
        bool activateImmediately = true) =>
        Loan.Create(Guid.NewGuid(), Guid.NewGuid(), null, LoanType.Lent, template,
            Money.Of(300m, Currency.USD), rate, RateUnit.Monthly, DayCount.Thirty360,
            PaymentFrequency.Monthly, 3, new DateOnly(2026, 1, 1), lateRate: lateRate,
            earlyPaymentPolicy: policy, activateImmediately: activateImmediately);

    private static DateTime PaymentDate(int dayOffset) =>
        new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(dayOffset - 1);

    private static LoanPayment AddRecordedPayment(Loan loan, decimal amount, DateTime date, long? sequence)
    {
        var payment = new LoanPayment(Guid.NewGuid(), loan.UserId, loan.Id, null, null,
            Money.Of(amount, loan.Principal.Currency), date, null, date, sequence, sequence.HasValue ? 1 : null);
        var installment = loan.Installments.First();
        payment.AddAllocation(installment.Id, 0m, 0m, amount);
        installment.ApplyPayment(0m, 0m, amount);
        var payments = (List<LoanPayment>)typeof(Loan).GetField("_payments", BindingFlags.Instance | BindingFlags.NonPublic)!
            .GetValue(loan)!;
        payments.Add(payment);
        return payment;
    }
}
