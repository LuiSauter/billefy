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
    public void InvestmentCashReversal_PreservesInvestmentMarkerAndSnapshot()
    {
        var investmentId = Guid.NewGuid();
        var original = Transaction.CreateInvestmentCash(_userId, Guid.NewGuid(), Money.Of(12m, Currency.USD),
            InvestmentCashKind.Contribution, investmentId, _now, "Contribution", 1.25m, "Manual");

        var reversal = Transaction.CreateReversal(original, _now.AddMinutes(1));

        reversal.InvestmentId.Should().Be(investmentId);
        reversal.InvestmentCashKind.Should().Be(InvestmentCashKind.Contribution);
        reversal.AppliedRate.Should().Be(1.25m);
        reversal.Direction.Should().Be(TransactionDirection.Income);
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
    public void Transaction_CreateTransferReversal_ShouldLinkBothOppositeLegsAndPreserveSnapshots()
    {
        var (outflow, inflow) = Transaction.CreateTransfer(
            _userId, Guid.NewGuid(), Money.Of(100m, Currency.BOB), Guid.NewGuid(),
            Money.Of(8.25m, Currency.USD), _now, 12.12m, "Rate source", "FX transfer");

        var (reversedOutflow, reversedInflow) = Transaction.CreateTransferReversal(outflow, inflow, _now.AddHours(1));

        reversedOutflow.TransferId.Should().Be(reversedInflow.TransferId);
        reversedOutflow.TransferId!.Value.Should().NotBe(outflow.TransferId!.Value);
        reversedOutflow.ReversesId.Should().Be(outflow.Id);
        reversedInflow.ReversesId.Should().Be(inflow.Id);
        reversedOutflow.Direction.Should().Be(TransactionDirection.Income);
        reversedInflow.Direction.Should().Be(TransactionDirection.Expense);
        reversedOutflow.Amount.Should().Be(outflow.Amount);
        reversedInflow.Amount.Should().Be(inflow.Amount);
        reversedOutflow.AppliedRate.Should().Be(12.12m);
        reversedInflow.RateSource.Should().Be("Rate source");
    }

    [Fact]
    public void TransactionCategoryAllocation_Create_RejectsNonPositiveAmount()
    {
        var act = () => TransactionCategoryAllocation.Create(_userId, Guid.NewGuid(), Guid.NewGuid(), 0m, _now);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Transaction_Create_WithAllocations_RequiresExactPositiveUniqueAllocationSum()
    {
        var categoryA = Guid.NewGuid();
        var categoryB = Guid.NewGuid();
        var create = (IReadOnlyList<TransactionCategoryAllocationInput> allocations) => Transaction.Create(
            _userId, Guid.NewGuid(), Money.Of(10m, Currency.BOB), TransactionDirection.Expense, null, _now, "Split", allocations: allocations);

        create([new(categoryA, 4m), new(categoryB, 6m)]).CategoryAllocations.Should().HaveCount(2);
        var wrongSum = () => create([new(categoryA, 4m), new(categoryB, 5m)]);
        var duplicate = () => create([new(categoryA, 4m), new(categoryA, 6m)]);
        var zero = () => create([new(categoryA, 0m), new(categoryB, 10m)]);
        var excessNativePrecision = () => create([new(categoryA, 1.001m), new(categoryB, 8.999m)]);
        wrongSum.Should().Throw<ArgumentException>().WithMessage("*sum*parent amount*");
        duplicate.Should().Throw<ArgumentException>().WithMessage("*duplicate category*");
        zero.Should().Throw<ArgumentOutOfRangeException>();
        excessNativePrecision.Should().Throw<ArgumentException>().WithMessage("*currency precision*");
    }

    [Fact]
    public void Transaction_CreateTransfer_WithAllocations_IsRejected()
    {
        var categoryId = Guid.NewGuid();
        var act = () => Transaction.CreateTransfer(_userId, Guid.NewGuid(), Money.Of(10m, Currency.BOB), Guid.NewGuid(),
            Money.Of(10m, Currency.BOB), _now, null, null, "Transfer",
            sourceAllocations: [new(categoryId, 10m)]);

        act.Should().Throw<ArgumentException>().WithMessage("*transfers cannot carry allocations*");
    }

    [Fact]
    public void Transaction_Reversal_CopiesAllocationsIntoNewImmutableRows()
    {
        var categoryId = Guid.NewGuid();
        var original = Transaction.Create(_userId, Guid.NewGuid(), Money.Of(10m, Currency.BOB), TransactionDirection.Expense,
            null, _now, "Split", 12.5m, "FX", allocations: [new(categoryId, 10m)]);

        var reversal = Transaction.CreateReversal(original, _now.AddHours(1));

        reversal.CategoryAllocations.Should().ContainSingle().Which.Should().Match<TransactionCategoryAllocation>(allocation =>
            allocation.Id != original.CategoryAllocations.Single().Id && allocation.TransactionId == reversal.Id &&
            allocation.UserId == _userId && allocation.CategoryId == categoryId && allocation.Amount == 10m);
        reversal.AppliedRate.Should().Be(12.5m);
        reversal.RateSource.Should().Be("FX");
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
