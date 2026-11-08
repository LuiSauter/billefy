using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Workspaces.Contracts;
using Workspaces.Domain.Expenses;
using Workspaces.Domain.Services;
using Workspaces.Domain.Settlements;

namespace Workspaces.Domain.Tests;

public sealed class BalanceMatrixCalculatorTests
{
    private static readonly Guid WorkspaceId = Guid.Parse("00000000-0000-0000-0000-000000000010");
    private static readonly Guid A = Guid.Parse("00000000-0000-0000-0000-000000000001");
    private static readonly Guid B = Guid.Parse("00000000-0000-0000-0000-000000000002");
    private static readonly Guid C = Guid.Parse("00000000-0000-0000-0000-000000000003");
    private static readonly DateOnly Date = new(2026, 11, 1);

    [Theory]
    [InlineData(0, 225)]
    [InlineData(100, 125)]
    [InlineData(225, 0)]
    public void PaymentAndCompletedSettlements_ProducePairwiseAndNetBalances(decimal settled, decimal debt)
    {
        var expense = Expense(A, 450m);
        WorkspaceSettlement[] settlements = settled == 0 ? [] : [Settlement(B, A, settled)];

        var result = BalanceMatrixCalculator.Calculate([expense], settlements);

        if (debt == 0)
            result.DebtPairs.Should().BeEmpty();
        else
            result.DebtPairs.Should().ContainSingle().Which.Should().Be(new PairwiseDebt(B, A, new Money(debt, Currency.USD)));
        result.MemberNetBalances.Single(x => x.MemberId == A).Balance.Should().Be(new Money(debt, Currency.USD));
        result.MemberNetBalances.Single(x => x.MemberId == B).Balance.Should().Be(new Money(-debt, Currency.USD));
        result.MemberNetBalances.Sum(x => x.Balance.Amount).Should().Be(0m);
    }

    [Fact]
    public void PendingSettlement_DoesNotReduceDebt_UntilCompleted()
    {
        var settlement = Settlement(B, A, 100m, status: SettlementStatus.Pending);
        var before = BalanceMatrixCalculator.Calculate([Expense(A, 450m)], [settlement]);
        before.DebtPairs.Single().Amount.Amount.Should().Be(225m);

        settlement.Complete();
        var after = BalanceMatrixCalculator.Calculate([Expense(A, 450m)], [settlement]);
        after.DebtPairs.Single().Amount.Amount.Should().Be(125m);
    }

    [Fact]
    public void OpposingExpenses_AreNettedWithinPair()
    {
        var result = BalanceMatrixCalculator.Calculate([Expense(A, 450m), Expense(B, 200m)], []);
        result.DebtPairs.Should().ContainSingle().Which.Should().Be(new PairwiseDebt(B, A, new Money(125m, Currency.USD)));
    }

    [Fact]
    public void Overpayment_ReversesPairDirection()
    {
        var result = BalanceMatrixCalculator.Calculate([Expense(A, 450m)], [Settlement(B, A, 300m)]);
        result.DebtPairs.Should().ContainSingle().Which.Should().Be(new PairwiseDebt(A, B, new Money(75m, Currency.USD)));
    }

    [Fact]
    public void ThreeMembers_PreservesActualPairsAndZeroSumNetBalances()
    {
        var expense = new WorkspaceExpense(Guid.NewGuid(), WorkspaceId, "Shared bill", new Money(90m, Currency.USD),
            A, Date, SplitRuleType.EqualParts,
            SplitCalculator.Calculate(new Money(90m, Currency.USD), SplitRuleType.EqualParts, [new(A), new(B), new(C)]));
        var result = BalanceMatrixCalculator.Calculate([expense], [Settlement(B, A, 10m)]);

        result.DebtPairs.Should().BeEquivalentTo(new[]
        {
            new PairwiseDebt(B, A, new Money(20m, Currency.USD)),
            new PairwiseDebt(C, A, new Money(30m, Currency.USD))
        });
        result.MemberNetBalances.Single(x => x.MemberId == A).Balance.Amount.Should().Be(50m);
        result.MemberNetBalances.Sum(x => x.Balance.Amount).Should().Be(0m);
    }

    [Fact]
    public void DifferentCurrencies_AreNeverCombined()
    {
        var result = BalanceMatrixCalculator.Calculate([Expense(A, 450m), Expense(A, 200m, Currency.BOB)],
            [Settlement(B, A, 25m, Currency.USD)]);

        result.DebtPairs.Should().HaveCount(2);
        result.DebtPairs.Single(x => x.Amount.Currency == Currency.USD).Amount.Amount.Should().Be(200m);
        result.DebtPairs.Single(x => x.Amount.Currency == Currency.BOB).Amount.Amount.Should().Be(100m);
        result.MemberNetBalances.Should().HaveCount(4);
    }

    [Fact]
    public void EmptyInput_ProducesEmptyMatrix()
    {
        var result = BalanceMatrixCalculator.Calculate([], []);
        result.DebtPairs.Should().BeEmpty();
        result.MemberNetBalances.Should().BeEmpty();
    }

    [Fact]
    public void MixedWorkspaces_AreRejected()
    {
        var other = new WorkspaceSettlement(Guid.NewGuid(), Guid.NewGuid(), B, A, new Money(10m, Currency.USD), Date);
        var act = () => BalanceMatrixCalculator.Calculate([Expense(A, 450m)], [other]);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void EnumerationOrder_DoesNotChangeResult_AndInputIsUnmodified()
    {
        var first = Expense(A, 450m);
        var second = Expense(B, 200m);
        var forward = BalanceMatrixCalculator.Calculate([first, second], []);
        var reverse = BalanceMatrixCalculator.Calculate([second, first], []);

        reverse.Should().BeEquivalentTo(forward, options => options.WithStrictOrdering());
        first.TotalAmount.Amount.Should().Be(450m);
        first.Allocations.Select(x => x.AllocatedAmount.Amount).Should().Equal(225m, 225m);
    }

    [Fact]
    public void DuplicateRecords_AreRejectedRatherThanDoubleCounted()
    {
        var expense = Expense(A, 450m);
        var settlement = Settlement(B, A, 100m);
        var duplicateExpenses = () => BalanceMatrixCalculator.Calculate([expense, expense], []);
        var duplicateSettlements = () => BalanceMatrixCalculator.Calculate([], [settlement, settlement]);
        duplicateExpenses.Should().Throw<ArgumentException>();
        duplicateSettlements.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void SettlementOnly_ProducesOffsettingBalances()
    {
        var result = BalanceMatrixCalculator.Calculate([], [Settlement(B, A, 100m)]);
        result.DebtPairs.Should().ContainSingle().Which.Should().Be(new PairwiseDebt(A, B, new Money(100m, Currency.USD)));
        result.MemberNetBalances.Single(x => x.MemberId == A).Balance.Amount.Should().Be(-100m);
        result.MemberNetBalances.Single(x => x.MemberId == B).Balance.Amount.Should().Be(100m);
    }

    private static WorkspaceExpense Expense(Guid payer, decimal amount, Currency? currency = null) =>
        new(Guid.NewGuid(), WorkspaceId, "Shared bill", new Money(amount, currency ?? Currency.USD), payer, Date,
            SplitRuleType.EqualParts, SplitCalculator.Calculate(new Money(amount, currency ?? Currency.USD),
                SplitRuleType.EqualParts, [new(A), new(B)]));

    private static WorkspaceSettlement Settlement(Guid payer, Guid receiver, decimal amount,
        Currency? currency = null, SettlementStatus status = SettlementStatus.Completed) =>
        new(Guid.NewGuid(), WorkspaceId, payer, receiver, new Money(amount, currency ?? Currency.USD), Date, status);
}
