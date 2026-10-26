using FluentAssertions;
using Ingestion.Application.Parsing;
using Ingestion.Domain.Drafts;
using Xunit;

namespace Ingestion.Domain.Tests;

public class RuleBasedFinancialParserTests
{
    private readonly RuleBasedFinancialParser _parser = new();
    private readonly DateTimeOffset _now = DateTimeOffset.UtcNow;

    [Fact]
    public void Parse_ShouldExtractIncome_WithBolivianosAndReference()
    {
        const string text = "Transferencia recibida por Bs. 150.00 de Juan Pérez. Nro: 123456";

        var result = _parser.Parse(text, _now);

        result.Success.Should().BeTrue();
        result.Amount.Should().Be(150.00m);
        result.Currency.Should().Be("BOB");
        result.Direction.Should().Be(DraftDirection.Income);
        result.Reference.Should().Be("123456");
        result.Confidence.Should().BeGreaterThanOrEqualTo(0.90m);
    }

    [Fact]
    public void Parse_ShouldExtractExpense_WithDollarsAndPrefix()
    {
        const string text = "Pago realizado por $25.50 en Starbucks. Ref: TX-7890";

        var result = _parser.Parse(text, _now);

        result.Success.Should().BeTrue();
        result.Amount.Should().Be(25.50m);
        result.Currency.Should().Be("USD");
        result.Direction.Should().Be(DraftDirection.Expense);
        result.Reference.Should().Be("TX-7890");
    }

    [Fact]
    public void Parse_ShouldHandleEuropeanNumberFormat_WithCommaDecimal()
    {
        const string text = "Has recibido un depósito de 1.250,50 Bs en tu cuenta";

        var result = _parser.Parse(text, _now);

        result.Success.Should().BeTrue();
        result.Amount.Should().Be(1250.50m);
        result.Currency.Should().Be("BOB");
        result.Direction.Should().Be(DraftDirection.Income);
    }

    [Fact]
    public void Parse_ShouldExtractATMWithdrawal_AsExpense()
    {
        const string text = "Retiro en cajero automático por 500 Bs";

        var result = _parser.Parse(text, _now);

        result.Success.Should().BeTrue();
        result.Amount.Should().Be(500m);
        result.Currency.Should().Be("BOB");
        result.Direction.Should().Be(DraftDirection.Expense);
    }

    [Fact]
    public void Parse_ShouldFail_WhenNonFinancialText()
    {
        const string text = "Hola mamá, te llamo más tarde para coordinar el almuerzo.";

        var result = _parser.Parse(text, _now);

        result.Success.Should().BeFalse();
        result.FailureReason.Should().NotBeNullOrEmpty();
    }
}
