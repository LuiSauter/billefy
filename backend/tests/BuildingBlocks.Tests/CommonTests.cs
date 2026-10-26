using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Time;
using FluentAssertions;
using Xunit;

namespace BuildingBlocks.Tests;

public class CommonTests
{
    [Fact]
    public void Currency_FromCode_ShouldReturnStandardInstance_WhenStandardCodeGiven()
    {
        var bob = Currency.FromCode("bob");
        bob.Should().BeSameAs(Currency.BOB);

        var usd = Currency.FromCode("USD");
        usd.Should().BeSameAs(Currency.USD);

        var usdt = Currency.FromCode("usdt");
        usdt.Should().BeSameAs(Currency.USDT);
    }

    [Fact]
    public void Currency_FromCode_ShouldCreateCustomCurrency()
    {
        var custom = Currency.FromCode("CLP", 0);
        custom.Code.Should().Be("CLP");
        custom.DecimalPlaces.Should().Be(0);
    }

    [Fact]
    public void Result_Success_ShouldHaveValueAndNoErrors()
    {
        var result = Result.Success("test value");

        result.IsSuccess.Should().BeTrue();
        result.IsFailure.Should().BeFalse();
        result.Value.Should().Be("test value");
    }

    [Fact]
    public void Result_Failure_ShouldHaveErrorAndThrowOnValueAccess()
    {
        var error = Error.Validation("User.Invalid", "Invalid user payload");
        var result = Result.Failure<string>(error);

        result.IsSuccess.Should().BeFalse();
        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(error);

        var act = () => _ = result.Value;
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Result_Match_ShouldExecuteMatchingBranch()
    {
        var successResult = Result.Success(42);
        var successOutcome = successResult.Match(val => $"Success: {val}", err => $"Error: {err.Code}");
        successOutcome.Should().Be("Success: 42");

        var failResult = Result.Failure<int>(Error.NotFound("Item.NotFound", "Item not found"));
        var failOutcome = failResult.Match(val => $"Success: {val}", err => $"Error: {err.Code}");
        failOutcome.Should().Be("Error: Item.NotFound");
    }

    [Fact]
    public void SystemClock_ShouldReturnUtcTime()
    {
        var clock = SystemClock.Instance;
        var before = DateTime.UtcNow;
        var now = clock.UtcNow;
        var after = DateTime.UtcNow;

        now.Kind.Should().Be(DateTimeKind.Utc);
        now.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
    }
}
