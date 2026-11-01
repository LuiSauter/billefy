using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Lending.Domain.Entities;
using Lending.Domain.Enums;

namespace Lending.Domain.Tests;

public class LoanCancellationTests
{
    [Fact]
    public void Cancel_ActiveUnpaidLoan_PersistsClosedStateAndOptionalReversal()
    {
        var loan = CreateLoan(Guid.NewGuid());
        loan.LinkDisbursementTransaction(Guid.NewGuid());
        var cancelledAt = new DateTime(2026, 2, 1, 12, 0, 0, DateTimeKind.Utc);
        var reversalId = Guid.NewGuid();

        loan.Cancel(cancelledAt, reversalId);

        loan.Status.Should().Be(LoanStatus.Cancelled);
        loan.ClosedAt.Should().Be(cancelledAt);
        loan.DisbursementReversalTransactionId.Should().Be(reversalId);
        loan.Installments.Should().NotBeEmpty();
        loan.RemainingPrincipal.Should().Be(100m);
    }

    [Fact]
    public void Cancel_ActiveUnpaidLoanWithoutLedgerReversal_IsAllowed()
    {
        var loan = CreateLoan();
        loan.Cancel(DateTime.UtcNow);
        loan.Status.Should().Be(LoanStatus.Cancelled);
        loan.DisbursementReversalTransactionId.Should().BeNull();
    }

    [Fact]
    public void Cancel_UnsupportedState_IsRejected()
    {
        var loan = CreateLoan();
        loan.Forgive(DateTime.UtcNow);

        var act = () => loan.Cancel(DateTime.UtcNow);

        act.Should().Throw<InvalidOperationException>();
        loan.Status.Should().Be(LoanStatus.Forgiven);
    }

    private static Loan CreateLoan(Guid? accountId = null) => Loan.Create(
        Guid.NewGuid(), Guid.NewGuid(), accountId, LoanType.Lent, LoanTemplate.NoInterest,
        Money.Of(100m, Currency.USD), 0m, RateUnit.Monthly, DayCount.Thirty360,
        PaymentFrequency.Monthly, 1, new DateOnly(2026, 1, 1));
}
