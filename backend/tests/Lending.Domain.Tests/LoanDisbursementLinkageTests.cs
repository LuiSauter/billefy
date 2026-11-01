using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Lending.Domain.Entities;
using Lending.Domain.Enums;

namespace Lending.Domain.Tests;

public class LoanDisbursementLinkageTests
{
    [Fact]
    public void LinkDisbursementTransaction_PersistsExactTransactionId()
    {
        var loan = Loan.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), LoanType.Lent, LoanTemplate.NoInterest,
            Money.Of(100m, Currency.USD), 0m, RateUnit.Monthly, DayCount.Thirty360,
            PaymentFrequency.Monthly, 1, new DateOnly(2026, 1, 1));
        var transactionId = Guid.NewGuid();

        loan.LinkDisbursementTransaction(transactionId);

        loan.DisbursementTransactionId.Should().Be(transactionId);
    }

    [Fact]
    public void LinkDisbursementTransaction_RejectsMissingAccountAndDuplicateLink()
    {
        var withoutAccount = Loan.Create(
            Guid.NewGuid(), Guid.NewGuid(), null, LoanType.Lent, LoanTemplate.NoInterest,
            Money.Of(100m, Currency.USD), 0m, RateUnit.Monthly, DayCount.Thirty360,
            PaymentFrequency.Monthly, 1, new DateOnly(2026, 1, 1));

        var actWithoutAccount = () => withoutAccount.LinkDisbursementTransaction(Guid.NewGuid());
        actWithoutAccount.Should().Throw<InvalidOperationException>();

        var linked = Loan.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), LoanType.Lent, LoanTemplate.NoInterest,
            Money.Of(100m, Currency.USD), 0m, RateUnit.Monthly, DayCount.Thirty360,
            PaymentFrequency.Monthly, 1, new DateOnly(2026, 1, 1));
        linked.LinkDisbursementTransaction(Guid.NewGuid());

        var actDuplicate = () => linked.LinkDisbursementTransaction(Guid.NewGuid());
        actDuplicate.Should().Throw<InvalidOperationException>();
    }
}
