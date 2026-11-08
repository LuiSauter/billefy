using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Workspaces.Contracts;
using Workspaces.Domain.Budgets;
using Workspaces.Domain.Events;
using Workspaces.Domain.Expenses;
using Workspaces.Domain.Goals;
using Workspaces.Domain.Income;
using Workspaces.Domain.Settlements;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Domain.Tests;

public sealed class SupportingEntitiesTests
{
    private static readonly DateTime Now = new(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc);
    private static readonly Guid WorkspaceId = Guid.Parse("00000000-0000-0000-0000-000000000010");
    private static readonly Guid A = Guid.Parse("00000000-0000-0000-0000-000000000001");
    private static readonly Guid B = Guid.Parse("00000000-0000-0000-0000-000000000002");

    [Fact]
    public void Invitation_CanOnlyBeAcceptedOnceBeforeExpiration()
    {
        var invitation = Invitation();
        invitation.Status.Should().Be(InvitationStatus.Pending);
        invitation.Accept(Now);
        invitation.Status.Should().Be(InvitationStatus.Accepted);
        var repeat = () => invitation.Accept(Now);
        var cancel = () => invitation.Cancel();
        repeat.Should().Throw<InvalidOperationException>();
        cancel.Should().Throw<InvalidOperationException>();

        var expired = Invitation();
        var acceptExpired = () => expired.Accept(Now.AddDays(1));
        acceptExpired.Should().Throw<InvalidOperationException>();
        expired.Status.Should().Be(InvitationStatus.Pending);
    }

    [Fact]
    public void Invitation_RejectAndCancelAreTerminal()
    {
        var rejected = Invitation();
        rejected.Reject();
        rejected.Status.Should().Be(InvitationStatus.Rejected);
        var accept = () => rejected.Accept(Now);
        accept.Should().Throw<InvalidOperationException>();
        var cancelled = Invitation();
        cancelled.Cancel();
        cancelled.Status.Should().Be(InvitationStatus.Cancelled);
        var reject = () => cancelled.Reject();
        reject.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Invitation_RejectsOwnerUnknownRoleEmptyTokenAndInvalidEmail()
    {
        var owner = () => Invitation(WorkspaceRole.Owner);
        var unknown = () => Invitation((WorkspaceRole)99);
        var noToken = () => new WorkspaceInvitation(Guid.NewGuid(), WorkspaceId, "member@example.invalid", " ", WorkspaceRole.Member, Now);
        var noEmail = () => new WorkspaceInvitation(Guid.NewGuid(), WorkspaceId, "invalid", "opaque-placeholder", WorkspaceRole.Member, Now);
        owner.Should().Throw<ArgumentException>();
        unknown.Should().Throw<ArgumentException>();
        noToken.Should().Throw<ArgumentException>();
        noEmail.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Budget_KeepsPeriodAndDefensivelyCopiesCategories()
    {
        var categories = new List<SharedBudgetCategory> { new(Guid.NewGuid(), Usd(75m)) };
        var budget = new SharedBudget(WorkspaceId, 2026, 11, Usd(100m), categories);
        categories.Clear();
        budget.Year.Should().Be(2026);
        budget.Month.Should().Be(11);
        budget.Categories.Should().ContainSingle();
        budget.TotalBudgetedAmount.Should().Be(Usd(100m));
    }

    [Fact]
    public void Budget_RejectsInvalidPeriodDuplicateCategoriesCurrencyMismatchAndExcess()
    {
        var category = new SharedBudgetCategory(Guid.NewGuid(), Usd(75m));
        var month = () => new SharedBudget(WorkspaceId, 2026, 13, Usd(100m), []);
        var duplicate = () => new SharedBudget(WorkspaceId, 2026, 11, Usd(200m), [category, category]);
        var mismatch = () => new SharedBudget(WorkspaceId, 2026, 11, Usd(100m), [new(Guid.NewGuid(), new Money(50m, Currency.BOB))]);
        var excess = () => new SharedBudget(WorkspaceId, 2026, 11, Usd(50m), [category]);
        month.Should().Throw<ArgumentException>();
        duplicate.Should().Throw<ArgumentException>();
        mismatch.Should().Throw<ArgumentException>();
        excess.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Goal_DerivesCurrentAmountFromContributions_AndReachesTarget()
    {
        var contributions = new List<SharedGoalContribution> { new(A, Usd(25m), Now) };
        var goal = new SharedGoal(Guid.NewGuid(), WorkspaceId, "Trip", Usd(100m), Usd(10m), memberContributions: contributions);
        contributions.Clear();
        goal.CurrentAmount.Should().Be(Usd(25m));
        goal.AddContribution(new SharedGoalContribution(B, Usd(75m), Now));
        goal.CurrentAmount.Should().Be(Usd(100m));
        goal.MemberContributions.Should().HaveCount(2);
        goal.Status.Should().Be(SharedGoalStatus.Reached);
    }

    [Fact]
    public void Goal_PausedContributionsAndMismatchedCurrenciesAreRejected()
    {
        var goal = new SharedGoal(Guid.NewGuid(), WorkspaceId, "Trip", Usd(100m), Usd(10m));
        goal.Pause();
        goal.Status.Should().Be(SharedGoalStatus.Paused);
        var paused = () => goal.AddContribution(new SharedGoalContribution(A, Usd(5m), Now));
        paused.Should().Throw<InvalidOperationException>();
        goal.Resume();
        goal.Status.Should().Be(SharedGoalStatus.Active);
        var mismatch = () => goal.AddContribution(new SharedGoalContribution(A, new Money(5m, Currency.BOB), Now));
        mismatch.Should().Throw<ArgumentException>();
        goal.CurrentAmount.Should().Be(Usd(0m));
    }

    [Fact]
    public void Goal_InitialContributionsAndCommitmentMustUseTargetCurrency()
    {
        var commitment = () => new SharedGoal(Guid.NewGuid(), WorkspaceId, "Trip", Usd(100m), new Money(10m, Currency.BOB));
        var contribution = () => new SharedGoal(Guid.NewGuid(), WorkspaceId, "Trip", Usd(100m), Usd(10m),
            memberContributions: [new(A, new Money(10m, Currency.BOB), Now)]);
        commitment.Should().Throw<ArgumentException>();
        contribution.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Event_ValidatesTypeAndSupportsCompletion()
    {
        var financialEvent = new SharedFinancialEvent(Guid.NewGuid(), WorkspaceId, "Rent", FinancialEventType.Payment,
            DateOnly.FromDateTime(Now), Usd(100m), A);
        financialEvent.IsCompleted.Should().BeFalse();
        financialEvent.Complete();
        financialEvent.IsCompleted.Should().BeTrue();
        var invalid = () => new SharedFinancialEvent(Guid.NewGuid(), WorkspaceId, "Rent", (FinancialEventType)99,
            DateOnly.FromDateTime(Now), Usd(100m), A);
        invalid.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Expense_CopiesAllocations_AndRejectsUnbalancedOrMixedCurrencySplits()
    {
        var allocations = new List<ExpenseSplitAllocation> { new(A, Usd(25m), 50m), new(B, Usd(25m), 50m) };
        var expense = Expense(allocations);
        allocations.Clear();
        expense.Allocations.Should().HaveCount(2);
        var unbalanced = () => Expense([new(A, Usd(49m), 100m)]);
        var mismatch = () => Expense([new(A, new Money(50m, Currency.BOB), 100m)]);
        var duplicate = () => Expense([new(A, Usd(25m), 50m), new(A, Usd(25m), 50m)]);
        unbalanced.Should().Throw<ArgumentException>();
        mismatch.Should().Throw<ArgumentException>();
        duplicate.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Income_RequiresPositiveAmountAndAllowsOnlyOneLedgerLink()
    {
        var income = new WorkspaceIncome(Guid.NewGuid(), WorkspaceId, "Salary", Usd(100m), A, DateOnly.FromDateTime(Now));
        income.PersonalTransactionId.Should().BeNull();
        income.ReceivedToAccountId.Should().BeNull();
        income.LinkAccount(Guid.NewGuid(), Guid.NewGuid());
        income.PersonalTransactionId.Should().NotBeEmpty();
        income.ReceivedToAccountId.Should().NotBeEmpty();
        var duplicate = () => income.LinkAccount(Guid.NewGuid(), Guid.NewGuid());
        var zero = () => new WorkspaceIncome(Guid.NewGuid(), WorkspaceId, "Salary", Usd(0m), A, DateOnly.FromDateTime(Now));
        duplicate.Should().Throw<ArgumentException>();
        zero.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Settlement_RejectsSelfPaymentNonPositiveAmountAndUnknownStatus()
    {
        var self = () => new WorkspaceSettlement(Guid.NewGuid(), WorkspaceId, A, A, Usd(10m), DateOnly.FromDateTime(Now));
        var zero = () => new WorkspaceSettlement(Guid.NewGuid(), WorkspaceId, A, B, Usd(0m), DateOnly.FromDateTime(Now));
        var status = () => new WorkspaceSettlement(Guid.NewGuid(), WorkspaceId, A, B, Usd(10m), DateOnly.FromDateTime(Now), (SettlementStatus)99);
        self.Should().Throw<ArgumentException>();
        zero.Should().Throw<ArgumentException>();
        status.Should().Throw<ArgumentException>();
    }

    private static WorkspaceInvitation Invitation(WorkspaceRole role = WorkspaceRole.Member) =>
        new(Guid.NewGuid(), WorkspaceId, "member@example.invalid", "opaque-placeholder", role, Now.AddDays(1));

    private static WorkspaceExpense Expense(IEnumerable<ExpenseSplitAllocation> allocations) =>
        new(Guid.NewGuid(), WorkspaceId, "Shared bill", Usd(50m), A, DateOnly.FromDateTime(Now), SplitRuleType.EqualParts, allocations);

    private static Money Usd(decimal amount) => new(amount, Currency.USD);
}
