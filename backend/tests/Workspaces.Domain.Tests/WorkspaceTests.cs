using BuildingBlocks.Currencies;
using FluentAssertions;
using Workspaces.Contracts;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Domain.Tests;

public sealed class WorkspaceTests
{
    private static readonly DateTime Now = new(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Workspace_KeepsCreatorCurrencySettingsAndExplicitTimestamp()
    {
        var creator = Guid.NewGuid();
        var workspace = new Workspace(Guid.NewGuid(), "  Trip fund  ", WorkspaceType.Trip, Currency.USD, creator, Now);

        workspace.Name.Should().Be("Trip fund");
        workspace.CreatedBy.Should().Be(creator);
        workspace.CreatedAt.Should().Be(Now);
        workspace.StartDate.Should().BeNull();
        workspace.BaseCurrency.Should().Be(Currency.USD);
        workspace.Settings.HidePersonalPatrimony.Should().BeTrue();
        workspace.Settings.MemberSeesOnlyShared.Should().BeTrue();
        workspace.IsActive.Should().BeTrue();
        workspace.Deactivate();
        workspace.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Workspace_RetainsExplicitFuturePlannedStartDateSeparatelyFromCreationTimestamp()
    {
        var planned = new DateOnly(2028, 2, 29);
        var workspace = new Workspace(Guid.NewGuid(), "Trip", WorkspaceType.Trip, Currency.USD,
            Guid.NewGuid(), Now, startDate: planned);

        workspace.StartDate.Should().Be(planned);
        workspace.CreatedAt.Should().Be(Now);
    }

    [Fact]
    public void Workspace_RejectsBlankNameUnknownTypeAndEmptyCreator()
    {
        var blank = () => new Workspace(Guid.NewGuid(), " ", WorkspaceType.Other, Currency.USD, Guid.NewGuid(), Now);
        var invalidType = () => new Workspace(Guid.NewGuid(), "Home", (WorkspaceType)99, Currency.USD, Guid.NewGuid(), Now);
        var noCreator = () => new Workspace(Guid.NewGuid(), "Home", WorkspaceType.Other, Currency.USD, Guid.Empty, Now);
        blank.Should().Throw<ArgumentException>();
        invalidType.Should().Throw<ArgumentException>();
        noCreator.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(WorkspaceRole.Owner, true)]
    [InlineData(WorkspaceRole.Admin, true)]
    [InlineData(WorkspaceRole.Member, false)]
    public void Member_ManagementRequiresActiveOwnerOrAdmin(WorkspaceRole role, bool canManage)
    {
        var member = Member(role);
        member.WorkspaceRole.Should().Be(role);
        member.CanManage.Should().Be(canManage);
        member.IncomeSharePercentage.Should().Be(60m);
        member.JoinedAt.Should().Be(Now);
        if (role != WorkspaceRole.Owner)
        {
            member.Deactivate();
            member.CanManage.Should().BeFalse();
        }
    }

    [Fact]
    public void Member_RejectsInvalidRoleAndIncomePercentage()
    {
        var invalidRole = () => Member((WorkspaceRole)99);
        var negative = () => Member(WorkspaceRole.Member, -1m);
        var tooHigh = () => Member(WorkspaceRole.Member, 101m);
        invalidRole.Should().Throw<ArgumentException>();
        negative.Should().Throw<ArgumentException>();
        tooHigh.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Member_RejectsInvalidIdentifiers()
    {
        var noWorkspace = () => new WorkspaceMember(Guid.NewGuid(), Guid.Empty, Guid.NewGuid(), WorkspaceRole.Member, 0m, Now);
        var noUser = () => new WorkspaceMember(Guid.NewGuid(), Guid.NewGuid(), Guid.Empty, WorkspaceRole.Member, 0m, Now);
        noWorkspace.Should().Throw<ArgumentException>();
        noUser.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Member_RoleChangeValidatesRoleAndProtectsOwnership()
    {
        var member = Member(WorkspaceRole.Member);
        member.ChangeRole(WorkspaceRole.Admin);
        member.CanManage.Should().BeTrue();
        var invalid = () => member.ChangeRole((WorkspaceRole)99);
        var promotion = () => member.ChangeRole(WorkspaceRole.Owner);
        var owner = Member(WorkspaceRole.Owner);
        var demotion = () => owner.ChangeRole(WorkspaceRole.Member);
        var removal = () => owner.Deactivate();
        invalid.Should().Throw<ArgumentException>();
        promotion.Should().Throw<InvalidOperationException>();
        demotion.Should().Throw<InvalidOperationException>();
        removal.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void InactiveMember_CannotChangeRoles()
    {
        var member = Member(WorkspaceRole.Member);
        member.Deactivate();
        var act = () => member.ChangeRole(WorkspaceRole.Admin);
        act.Should().Throw<InvalidOperationException>();
    }

    private static WorkspaceMember Member(WorkspaceRole role, decimal percentage = 60m) =>
        new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), role, percentage, Now);
}
