using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Workspaces.Contracts;
using Workspaces.Domain.Services;

namespace Workspaces.Domain.Tests;

public sealed class SplitCalculatorTests
{
    private static readonly Guid A = Guid.Parse("00000000-0000-0000-0000-000000000001");
    private static readonly Guid B = Guid.Parse("00000000-0000-0000-0000-000000000002");
    private static readonly Guid C = Guid.Parse("00000000-0000-0000-0000-000000000003");

    [Theory]
    [InlineData(100, 50, 50)]
    [InlineData(100.01, 50.01, 50)]
    public void EqualParts_TwoMembers_ConservesEveryCent(decimal total, decimal first, decimal second)
    {
        var allocations = SplitCalculator.Calculate(new Money(total, Currency.USD), SplitRuleType.EqualParts,
            [new(A), new(B)]);

        allocations.Select(x => x.AllocatedAmount.Amount).Should().Equal(first, second);
        allocations.Sum(x => x.AllocatedAmount.Amount).Should().Be(total);
        allocations.Should().OnlyContain(x => x.AllocatedAmount.Currency == Currency.USD);
    }

    [Fact]
    public void EqualParts_ThreeMembers_AssignsRemainingCentToFirst()
    {
        var allocations = SplitCalculator.Calculate(new Money(100m, Currency.USD), SplitRuleType.EqualParts,
            [new(A), new(B), new(C)]);

        allocations.Select(x => x.MemberId).Should().Equal(A, B, C);
        allocations.Select(x => x.AllocatedAmount.Amount).Should().Equal(33.34m, 33.33m, 33.33m);
        allocations.Sum(x => x.AllocatedAmount.Amount).Should().Be(100m);
    }

    [Fact]
    public void EqualParts_ExactlyDivisibleTotal_DoesNotCreateArtificialRemainder()
    {
        var allocations = SplitCalculator.Calculate(new Money(90m, Currency.USD), SplitRuleType.EqualParts,
            [new(A), new(B), new(C)]);
        allocations.Select(x => x.AllocatedAmount.Amount).Should().Equal(30m, 30m, 30m);
    }

    [Fact]
    public void EqualParts_PayerGetsRemainder_WhenNotFirst()
    {
        var allocations = SplitCalculator.Calculate(new Money(100m, Currency.USD), SplitRuleType.EqualParts,
            [new(A), new(B), new(C)], B);

        allocations.Select(x => x.AllocatedAmount.Amount).Should().Equal(33.33m, 33.34m, 33.33m);
    }

    [Fact]
    public void IncomeProportional_UsesIncomePercentages()
    {
        var allocations = SplitCalculator.Calculate(new Money(4000m, Currency.BOB), SplitRuleType.IncomeProportional,
            [new(A, IncomeSharePercentage: 60m), new(B, IncomeSharePercentage: 40m)]);

        allocations.Select(x => x.AllocatedAmount.Amount).Should().Equal(2400m, 1600m);
        allocations.Select(x => x.Percentage).Should().Equal(60m, 40m);
    }

    [Fact]
    public void CustomPercentage_UsesExplicitShares()
    {
        var allocations = SplitCalculator.Calculate(new Money(100m, Currency.USD), SplitRuleType.CustomPercentage,
            [new(A, CustomPercentage: 25m), new(B, CustomPercentage: 75m)]);

        allocations.Select(x => x.AllocatedAmount.Amount).Should().Equal(25m, 75m);
    }

    [Fact]
    public void ByResponsibility_NormalizesWeights_AndDoesNotChargeZeroWeightPayer()
    {
        var allocations = SplitCalculator.Calculate(new Money(0.01m, Currency.USD), SplitRuleType.ByResponsibility,
            [new(A), new(B, ResponsibilityWeight: 2m), new(C, ResponsibilityWeight: 1m)], A);

        allocations.Select(x => x.AllocatedAmount.Amount).Should().Equal(0m, 0.01m, 0m);
    }

    [Fact]
    public void EqualParts_RespectsCurrencyPrecision()
    {
        var allocations = SplitCalculator.Calculate(new Money(0.00000001m, Currency.BTC), SplitRuleType.EqualParts,
            [new(A), new(B)]);

        allocations.Select(x => x.AllocatedAmount.Amount).Should().Equal(0.00000001m, 0m);
        allocations.Sum(x => x.AllocatedAmount.Amount).Should().Be(0.00000001m);
    }

    [Fact]
    public void EqualParts_ManyTotals_AlwaysConservesTotalAndNeverGoesNegative()
    {
        for (var cents = 1; cents <= 301; cents++)
        {
            var total = new Money(cents / 100m, Currency.USD);
            var allocations = SplitCalculator.Calculate(total, SplitRuleType.EqualParts, [new(A), new(B), new(C)], C);
            allocations.Sum(x => x.AllocatedAmount.Amount).Should().Be(total.Amount);
            allocations.Should().OnlyContain(x => x.AllocatedAmount.Amount >= 0m);
        }
    }

    [Theory]
    [InlineData(SplitRuleType.IncomeProportional)]
    [InlineData(SplitRuleType.CustomPercentage)]
    [InlineData(SplitRuleType.ByResponsibility)]
    public void WeightedRules_RejectMissingWeights(SplitRuleType rule)
    {
        var act = () => SplitCalculator.Calculate(new Money(100m, Currency.USD), rule, [new(A), new(B)]);
        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(-10, 110)]
    [InlineData(60, 30)]
    public void IncomeProportional_RejectsInvalidPercentages(decimal first, decimal second)
    {
        var act = () => SplitCalculator.Calculate(new Money(100m, Currency.USD), SplitRuleType.IncomeProportional,
            [new(A, first), new(B, second)]);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void RejectsEmptyDuplicateOrUnknownMembersAndInvalidRules()
    {
        var money = new Money(100m, Currency.USD);
        var empty = () => SplitCalculator.Calculate(money, SplitRuleType.EqualParts, []);
        var duplicate = () => SplitCalculator.Calculate(money, SplitRuleType.EqualParts, [new(A), new(A)]);
        var invalidId = () => SplitCalculator.Calculate(money, SplitRuleType.EqualParts, [new(Guid.Empty)]);
        var invalidPayer = () => SplitCalculator.Calculate(money, SplitRuleType.EqualParts, [new(A)], B);
        var invalidRule = () => SplitCalculator.Calculate(money, (SplitRuleType)99, [new(A)]);
        empty.Should().Throw<ArgumentException>();
        duplicate.Should().Throw<ArgumentException>();
        invalidId.Should().Throw<ArgumentException>();
        invalidPayer.Should().Throw<ArgumentException>();
        invalidRule.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void WeightedRules_RejectNegativeResponsibilityAndCustomShares()
    {
        var responsibility = () => SplitCalculator.Calculate(new Money(100m, Currency.USD), SplitRuleType.ByResponsibility,
            [new(A, ResponsibilityWeight: -1m), new(B, ResponsibilityWeight: 2m)]);
        var custom = () => SplitCalculator.Calculate(new Money(100m, Currency.USD), SplitRuleType.CustomPercentage,
            [new(A, CustomPercentage: 110m), new(B, CustomPercentage: -10m)]);
        responsibility.Should().Throw<ArgumentException>();
        custom.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void WeightedRules_ManySmallTotals_ConserveTotalWithoutChargingZeroShare()
    {
        for (var cents = 1; cents <= 301; cents++)
        {
            var total = new Money(cents / 100m, Currency.USD);
            var allocations = SplitCalculator.Calculate(total, SplitRuleType.IncomeProportional,
                [new(A, 0m), new(B, 60m), new(C, 40m)], A);
            allocations.Sum(x => x.AllocatedAmount.Amount).Should().Be(total.Amount);
            allocations.Should().OnlyContain(x => x.AllocatedAmount.Amount >= 0m);
            allocations[0].AllocatedAmount.Amount.Should().Be(0m);
        }
    }

    [Fact]
    public void EqualParts_ZeroDecimalCurrency_UsesWholeUnits()
    {
        var allocations = SplitCalculator.Calculate(new Money(100m, Currency.FromCode("JPY", 0)),
            SplitRuleType.EqualParts, [new(A), new(B), new(C)]);
        allocations.Select(x => x.AllocatedAmount.Amount).Should().Equal(34m, 33m, 33m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void RejectsNonPositiveAmounts(decimal amount)
    {
        var act = () => SplitCalculator.Calculate(new Money(amount, Currency.USD), SplitRuleType.EqualParts, [new(A)]);
        act.Should().Throw<ArgumentException>();
    }
}
