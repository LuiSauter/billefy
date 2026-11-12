using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Lending.Domain.Entities;
using Xunit;

namespace Lending.Domain.Tests;

public class DynamicLoanPaymentMetadataTests
{
    private static readonly DateTime PaymentDate = new(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly EffectiveDate = new(2026, 11, 1);

    [Fact]
    public void ExistingConstructor_PreservesNullLegacyMetadata()
    {
        var payment = new LoanPayment(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), null, null,
            Money.Of(50m, Currency.BOB), PaymentDate, null, PaymentDate);

        payment.RecordSequence.Should().BeNull();
        payment.CalculationVersion.Should().BeNull();
        payment.EarlyPrincipalAmount.Should().BeNull();
        payment.EarlyPrincipalEffectiveDate.Should().BeNull();
    }

    [Fact]
    public void Metadata_PreservesExactAmountCurrencyAndProvenance()
    {
        var payment = Create(long.MaxValue, int.MaxValue, 12.345678m, EffectiveDate);

        payment.RecordSequence.Should().Be(long.MaxValue);
        payment.CalculationVersion.Should().Be(int.MaxValue);
        payment.EarlyPrincipalAmount.Should().Be(12.345678m);
        payment.EarlyPrincipalEffectiveDate.Should().Be(EffectiveDate);
        payment.Amount.Currency.Should().Be(Currency.BOB);
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(-1, 1)]
    [InlineData(1, 0)]
    [InlineData(1, -1)]
    public void Metadata_RejectsNonPositiveSequenceOrVersion(long sequence, int version)
    {
        var act = () => Create(sequence, version);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData(1, false)]
    [InlineData(0, true)]
    [InlineData(-1, true)]
    public void EarlyPrincipal_RequiresPositiveAmountAndPairedDate(int? amount, bool hasDate)
    {
        var act = () => Create(1, 1, amount, hasDate ? EffectiveDate : null);
        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(14)]
    [InlineData(15)]
    public void EarlyPrincipal_RequiresFutureEffectiveDate(int day)
    {
        var act = () => Create(1, 1, 10m, new DateOnly(2026, 10, day));
        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(nameof(LoanPayment.RecordSequence))]
    [InlineData(nameof(LoanPayment.CalculationVersion))]
    [InlineData(nameof(LoanPayment.EarlyPrincipalAmount))]
    [InlineData(nameof(LoanPayment.EarlyPrincipalEffectiveDate))]
    public void Metadata_HasOnlyPrivateInitAccess(string propertyName)
    {
        var setter = typeof(LoanPayment).GetProperty(propertyName)!.SetMethod!;
        setter.IsPrivate.Should().BeTrue();
        setter.ReturnParameter.GetRequiredCustomModifiers()
            .Should().Contain(typeof(System.Runtime.CompilerServices.IsExternalInit));
    }

    private static LoanPayment Create(long? sequence, int? version, decimal? early = null, DateOnly? effective = null) =>
        new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), null, null,
            Money.Of(50m, Currency.BOB), PaymentDate, null, PaymentDate,
            recordSequence: sequence, calculationVersion: version,
            earlyPrincipalAmount: early, earlyPrincipalEffectiveDate: effective);
}
