using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Ledger.Domain.Accounts;
using Ledger.Domain.Transactions;
using Xunit;

namespace Ledger.Domain.Tests;

public class LedgerDomainTests
{
    private readonly Guid _userId = Guid.NewGuid();
    private readonly DateTime _now = new(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Account_Create_ShouldInitializeCorrectly()
    {
        var initial = Money.Of(500m, Currency.BOB);
        var account = Account.Create(_userId, "Banco Unión", AccountType.Bank, Currency.BOB, initial, _now);

        account.UserId.Should().Be(_userId);
        account.Name.Should().Be("Banco Unión");
        account.Type.Should().Be(AccountType.Bank);
        account.Currency.Should().Be(Currency.BOB);
        account.InitialBalance.Should().Be(initial);
        account.IsArchived.Should().BeFalse();
    }

    [Fact]
    public void Account_Create_WithMismatchedCurrency_ShouldThrowArgumentException()
    {
        var initialUsd = Money.Of(100m, Currency.USD);
        var act = () => Account.Create(_userId, "Cuenta BOB", AccountType.Bank, Currency.BOB, initialUsd, _now);

        act.Should().Throw<ArgumentException>()
            .WithMessage("*Initial balance currency must match*");
    }

    [Fact]
    public void Transaction_Create_WithZeroOrNegativeAmount_ShouldThrowArgumentException()
    {
        var zero = Money.Zero(Currency.USD);
        var actZero = () => Transaction.Create(_userId, Guid.NewGuid(), zero, TransactionDirection.Expense, null, _now, "Test");

        actZero.Should().Throw<ArgumentException>()
            .WithMessage("*strictly greater than zero*");
    }

    [Fact]
    public void Transaction_CreateReversal_ShouldInvertDirectionAndLinkReversesId()
    {
        var originalExpense = Transaction.Create(
            _userId,
            Guid.NewGuid(),
            Money.Of(50m, Currency.BOB),
            TransactionDirection.Expense,
            null,
            _now,
            "Almuerzo",
            appliedRate: 11.96m,
            rateSource: "DolarApi");

        var reversal = Transaction.CreateReversal(originalExpense, _now.AddHours(1), "Gasto duplicado");

        reversal.UserId.Should().Be(originalExpense.UserId);
        reversal.AccountId.Should().Be(originalExpense.AccountId);
        reversal.Amount.Should().Be(originalExpense.Amount);
        reversal.Direction.Should().Be(TransactionDirection.Income); // Expense -> Income
        reversal.ReversesId.Should().Be(originalExpense.Id);
        reversal.AppliedRate.Should().Be(originalExpense.AppliedRate);
        reversal.RateSource.Should().Be(originalExpense.RateSource);
        reversal.Description.Should().Contain("Gasto duplicado");
    }

    [Fact]
    public void Transaction_CreateTransfer_ShouldCreateLinkedPairWithSharedTransferId()
    {
        var sourceAccount = Guid.NewGuid();
        var destAccount = Guid.NewGuid();

        var (outflow, inflow) = Transaction.CreateTransfer(
            _userId,
            sourceAccount,
            Money.Of(1000m, Currency.BOB),
            destAccount,
            Money.Of(83.33m, Currency.USD),
            _now,
            appliedRate: 12.00m,
            rateSource: "DolarApi",
            "Cambio de bolivianos a dólares");

        outflow.TransferId.Should().NotBeNull();
        inflow.TransferId.Should().Be(outflow.TransferId);

        outflow.AccountId.Should().Be(sourceAccount);
        outflow.Direction.Should().Be(TransactionDirection.Expense);
        outflow.Amount.Currency.Should().Be(Currency.BOB);

        inflow.AccountId.Should().Be(destAccount);
        inflow.Direction.Should().Be(TransactionDirection.Income);
        inflow.Amount.Currency.Should().Be(Currency.USD);
    }
}
