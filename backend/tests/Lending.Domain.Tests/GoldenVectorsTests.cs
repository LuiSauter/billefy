using FluentAssertions;
using Lending.Domain.Engine;
using Lending.Domain.Engine.Schemes;
using Lending.Domain.Enums;
using Xunit;

namespace Lending.Domain.Tests;

public class GoldenVectorsTests
{
    private readonly DateOnly _disbursementDate = new(2026, 1, 1);

    [Fact]
    public void VectorA_NoInterest()
    {
        var parameters = new LoanParameters(
            Principal: 1000m,
            Rate: 0m,
            RateUnit: RateUnit.Monthly,
            DayCount: DayCount.Thirty360,
            Frequency: PaymentFrequency.Monthly,
            TotalInstallments: 3,
            DisbursementDate: _disbursementDate);

        var generator = LoanScheduleGeneratorFactory.Create(LoanTemplate.NoInterest);
        var schedule = generator.GenerateSchedule(parameters);

        schedule.TotalPrincipal.Should().Be(1000m);
        schedule.TotalInterest.Should().Be(0m);
        schedule.TotalToPay.Should().Be(1000m);
        schedule.Installments.Should().HaveCount(3);

        // k = 1
        schedule.Installments[0].Principal.Should().Be(333.33m);
        schedule.Installments[0].Interest.Should().Be(0.00m);
        schedule.Installments[0].Total.Should().Be(333.33m);

        // k = 2
        schedule.Installments[1].Principal.Should().Be(333.33m);
        schedule.Installments[1].Interest.Should().Be(0.00m);
        schedule.Installments[1].Total.Should().Be(333.33m);

        // k = 3
        schedule.Installments[2].Principal.Should().Be(333.34m);
        schedule.Installments[2].Interest.Should().Be(0.00m);
        schedule.Installments[2].Total.Should().Be(333.34m);
    }

    [Fact]
    public void VectorB_FlatOnInitialCapital()
    {
        var parameters = new LoanParameters(
            Principal: 1000m,
            Rate: 0.10m,
            RateUnit: RateUnit.Monthly,
            DayCount: DayCount.Thirty360,
            Frequency: PaymentFrequency.Monthly,
            TotalInstallments: 3,
            DisbursementDate: _disbursementDate);

        var generator = LoanScheduleGeneratorFactory.Create(LoanTemplate.FlatOnInitialCapital);
        var schedule = generator.GenerateSchedule(parameters);

        schedule.TotalInterest.Should().Be(300.00m);
        schedule.TotalToPay.Should().Be(1300.00m);
        schedule.AnnualEffectiveRate.Should().Be(4.003477m);

        // k = 1
        schedule.Installments[0].Principal.Should().Be(333.33m);
        schedule.Installments[0].Interest.Should().Be(100.00m);
        schedule.Installments[0].Total.Should().Be(433.33m);

        // k = 2
        schedule.Installments[1].Principal.Should().Be(333.33m);
        schedule.Installments[1].Interest.Should().Be(100.00m);
        schedule.Installments[1].Total.Should().Be(433.33m);

        // k = 3
        schedule.Installments[2].Principal.Should().Be(333.34m);
        schedule.Installments[2].Interest.Should().Be(100.00m);
        schedule.Installments[2].Total.Should().Be(433.34m);
    }

    [Fact]
    public void VectorC_SimpleOnBalance()
    {
        var parameters = new LoanParameters(
            Principal: 1000m,
            Rate: 0.05m,
            RateUnit: RateUnit.Monthly,
            DayCount: DayCount.Thirty360,
            Frequency: PaymentFrequency.Monthly,
            TotalInstallments: 4,
            DisbursementDate: _disbursementDate);

        var generator = LoanScheduleGeneratorFactory.Create(LoanTemplate.SimpleOnBalance);
        var schedule = generator.GenerateSchedule(parameters);

        schedule.TotalInterest.Should().Be(125.00m);
        schedule.AnnualEffectiveRate.Should().Be(0.795856m);

        // k = 1
        schedule.Installments[0].Principal.Should().Be(250.00m);
        schedule.Installments[0].Interest.Should().Be(50.00m);
        schedule.Installments[0].Total.Should().Be(300.00m);
        schedule.Installments[0].BalanceAfter.Should().Be(750.00m);

        // k = 2
        schedule.Installments[1].Principal.Should().Be(250.00m);
        schedule.Installments[1].Interest.Should().Be(37.50m);
        schedule.Installments[1].Total.Should().Be(287.50m);
        schedule.Installments[1].BalanceAfter.Should().Be(500.00m);

        // k = 3
        schedule.Installments[2].Principal.Should().Be(250.00m);
        schedule.Installments[2].Interest.Should().Be(25.00m);
        schedule.Installments[2].Total.Should().Be(275.00m);
        schedule.Installments[2].BalanceAfter.Should().Be(250.00m);

        // k = 4
        schedule.Installments[3].Principal.Should().Be(250.00m);
        schedule.Installments[3].Interest.Should().Be(12.50m);
        schedule.Installments[3].Total.Should().Be(262.50m);
        schedule.Installments[3].BalanceAfter.Should().Be(0.00m);
    }

    [Fact]
    public void VectorD_FixedInstallment()
    {
        var parameters = new LoanParameters(
            Principal: 1000m,
            Rate: 0.02m,
            RateUnit: RateUnit.Monthly,
            DayCount: DayCount.Thirty360,
            Frequency: PaymentFrequency.Monthly,
            TotalInstallments: 12,
            DisbursementDate: _disbursementDate);

        var generator = LoanScheduleGeneratorFactory.Create(LoanTemplate.FixedInstallment);
        var schedule = generator.GenerateSchedule(parameters);

        schedule.TotalPrincipal.Should().Be(1000.00m);
        schedule.TotalInterest.Should().Be(134.70m);
        schedule.AnnualEffectiveRate.Should().Be(0.268242m);

        // k = 1
        schedule.Installments[0].Principal.Should().Be(74.56m);
        schedule.Installments[0].Interest.Should().Be(20.00m);
        schedule.Installments[0].Total.Should().Be(94.56m);
        schedule.Installments[0].BalanceAfter.Should().Be(925.44m);

        // k = 2
        schedule.Installments[1].Principal.Should().Be(76.05m);
        schedule.Installments[1].Interest.Should().Be(18.51m);
        schedule.Installments[1].Total.Should().Be(94.56m);
        schedule.Installments[1].BalanceAfter.Should().Be(849.39m);

        // k = 3
        schedule.Installments[2].Principal.Should().Be(77.57m);
        schedule.Installments[2].Interest.Should().Be(16.99m);
        schedule.Installments[2].Total.Should().Be(94.56m);
        schedule.Installments[2].BalanceAfter.Should().Be(771.82m);

        // k = 11
        schedule.Installments[10].Principal.Should().Be(90.89m);
        schedule.Installments[10].Interest.Should().Be(3.67m);
        schedule.Installments[10].Total.Should().Be(94.56m);
        schedule.Installments[10].BalanceAfter.Should().Be(92.69m);

        // k = 12
        schedule.Installments[11].Principal.Should().Be(92.69m);
        schedule.Installments[11].Interest.Should().Be(1.85m);
        schedule.Installments[11].Total.Should().Be(94.54m);
        schedule.Installments[11].BalanceAfter.Should().Be(0.00m);
    }

    [Fact]
    public void VectorE_InterestOnly()
    {
        var parameters = new LoanParameters(
            Principal: 1000m,
            Rate: 0.03m,
            RateUnit: RateUnit.Monthly,
            DayCount: DayCount.Thirty360,
            Frequency: PaymentFrequency.Monthly,
            TotalInstallments: 3,
            DisbursementDate: _disbursementDate);

        var generator = LoanScheduleGeneratorFactory.Create(LoanTemplate.InterestOnly);
        var schedule = generator.GenerateSchedule(parameters);

        schedule.TotalInterest.Should().Be(90.00m);
        schedule.AnnualEffectiveRate.Should().Be(0.425761m);

        // k = 1
        schedule.Installments[0].Principal.Should().Be(0.00m);
        schedule.Installments[0].Interest.Should().Be(30.00m);
        schedule.Installments[0].Total.Should().Be(30.00m);

        // k = 2
        schedule.Installments[1].Principal.Should().Be(0.00m);
        schedule.Installments[1].Interest.Should().Be(30.00m);
        schedule.Installments[1].Total.Should().Be(30.00m);

        // k = 3
        schedule.Installments[2].Principal.Should().Be(1000.00m);
        schedule.Installments[2].Interest.Should().Be(30.00m);
        schedule.Installments[2].Total.Should().Be(1030.00m);
        schedule.Installments[2].BalanceAfter.Should().Be(0.00m);
    }

    [Fact]
    public void VectorF_SinglePaymentCompound()
    {
        var disbursement = new DateOnly(2026, 1, 1);
        var maturity = new DateOnly(2026, 7, 1); // 181 days

        var parameters = new LoanParameters(
            Principal: 1000m,
            Rate: 0.02m,
            RateUnit: RateUnit.Monthly,
            DayCount: DayCount.Thirty360,
            Frequency: PaymentFrequency.Single,
            TotalInstallments: 1,
            DisbursementDate: disbursement,
            Compounding: PaymentFrequency.Monthly,
            CompoundingPeriods: 6,
            MaturityDate: maturity);

        var generator = LoanScheduleGeneratorFactory.Create(LoanTemplate.SinglePaymentCompound);
        var schedule = generator.GenerateSchedule(parameters);

        schedule.TotalToPay.Should().Be(1126.16m);
        schedule.TotalInterest.Should().Be(126.16m);
        schedule.AnnualEffectiveRate.Should().Be(0.270736m);
        schedule.Installments.Should().HaveCount(1);
        schedule.Installments[0].DueDate.Should().Be(maturity);
    }

    [Fact]
    public void VectorG_LateInterest()
    {
        var dueDate = new DateOnly(2026, 2, 1);
        var paymentDate = dueDate.AddDays(10); // 10 days late

        var lateInterest = LateInterestCalculator.Calculate(
            overduePrincipal: 250.00m,
            lateRate: 0.03m,
            unit: RateUnit.Monthly,
            dayCount: DayCount.Thirty360,
            dueDate: dueDate,
            paymentDate: paymentDate,
            graceDays: 0);

        lateInterest.Should().Be(2.50m);
    }

    [Fact]
    public void VectorH_PaymentAllocation()
    {
        var inst1 = new InstallmentPaymentState
        {
            Id = Guid.NewGuid(),
            Number = 1,
            DueDate = new DateOnly(2026, 2, 1),
            ExpectedPrincipal = 250.00m,
            ExpectedInterest = 50.00m,
            CalculatedLateInterest = 2.50m
        };

        var result = PaymentAllocator.Allocate(
            paymentAmount: 100.00m,
            installments: [inst1],
            order: PaymentAllocationOrder.LateInterestInterestPrincipal);

        result.RemainingUnallocatedAmount.Should().Be(0m);
        result.Allocations.Should().HaveCount(1);

        var alloc = result.Allocations[0];
        alloc.ToLateInterest.Should().Be(2.50m);
        alloc.ToInterest.Should().Be(50.00m);
        alloc.ToPrincipal.Should().Be(47.50m);

        // Check installment state
        inst1.PaidLateInterest.Should().Be(2.50m);
        inst1.PaidInterest.Should().Be(50.00m);
        inst1.PaidPrincipal.Should().Be(47.50m);
        inst1.RemainingPrincipal.Should().Be(202.50m);
    }
}
