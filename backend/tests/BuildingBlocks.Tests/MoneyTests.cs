using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Xunit;

namespace BuildingBlocks.Tests;

public class MoneyTests
{
    [Fact]
    public void Money_ShouldRoundToCurrencyScale_UsingHalfAwayFromZero()
    {
        // Half away from zero rounding checks at 2 decimal places
        var m1 = Money.Of(10.555m, Currency.BOB);
        m1.Amount.Should().Be(10.56m);

        var m2 = Money.Of(10.554m, Currency.BOB);
        m2.Amount.Should().Be(10.55m);

        var m3 = Money.Of(10.555m, Currency.USD);
        m3.Amount.Should().Be(10.56m);

        // Negative numbers half away from zero
        var m4 = Money.Of(-10.555m, Currency.USD);
        m4.Amount.Should().Be(-10.56m);
    }

    [Fact]
    public void Addition_WithSameCurrency_ShouldSucceed()
    {
        var m1 = Money.Of(100.50m, Currency.BOB);
        var m2 = Money.Of(50.25m, Currency.BOB);

        var result = m1 + m2;

        result.Amount.Should().Be(150.75m);
        result.Currency.Should().Be(Currency.BOB);
    }

    [Fact]
    public void Addition_WithDifferentCurrencies_ShouldThrowCurrencyMismatchException()
    {
        var m1 = Money.Of(100m, Currency.BOB);
        var m2 = Money.Of(50m, Currency.USD);

        var act = () => _ = m1 + m2;

        act.Should().Throw<CurrencyMismatchException>()
            .WithMessage("*BOB*USD*");
    }

    [Fact]
    public void Subtraction_WithSameCurrency_ShouldSucceed()
    {
        var m1 = Money.Of(100.00m, Currency.USD);
        var m2 = Money.Of(40.50m, Currency.USD);

        var result = m1 - m2;

        result.Amount.Should().Be(59.50m);
        result.Currency.Should().Be(Currency.USD);
    }

    [Fact]
    public void Multiplication_ShouldScaleAndRoundProperly()
    {
        var money = Money.Of(10.00m, Currency.USD);

        var result = money * 1.555m; // 15.550 -> 15.55

        result.Amount.Should().Be(15.55m);
    }

    [Fact]
    public void Division_ShouldScaleAndRoundProperly()
    {
        var money = Money.Of(100.00m, Currency.BOB);

        var result = money / 3m; // 33.333333... -> 33.33

        result.Amount.Should().Be(33.33m);
    }

    [Fact]
    public void Division_ByZero_ShouldThrowDivideByZeroException()
    {
        var money = Money.Of(100m, Currency.BOB);

        var act = () => _ = money / 0m;

        act.Should().Throw<DivideByZeroException>();
    }

    [Fact]
    public void Comparisons_ShouldWorkCorrectly()
    {
        var m1 = Money.Of(50m, Currency.BOB);
        var m2 = Money.Of(100m, Currency.BOB);
        var m3 = Money.Of(50m, Currency.BOB);

        (m1 < m2).Should().BeTrue();
        (m1 <= m3).Should().BeTrue();
        (m2 > m1).Should().BeTrue();
        (m1 == m3).Should().BeTrue();
        (m1 != m2).Should().BeTrue();
    }

    [Fact]
    public void Properties_Zero_Positive_Negative_Abs()
    {
        var zero = Money.Zero(Currency.BOB);
        zero.IsZero.Should().BeTrue();
        zero.IsPositive.Should().BeFalse();
        zero.IsNegative.Should().BeFalse();

        var positive = Money.Of(10m, Currency.BOB);
        positive.IsPositive.Should().BeTrue();

        var negative = Money.Of(-10m, Currency.BOB);
        negative.IsNegative.Should().BeTrue();
        negative.Abs().Amount.Should().Be(10m);
    }
}
