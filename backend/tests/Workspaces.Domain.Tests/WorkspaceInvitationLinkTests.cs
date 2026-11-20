using FluentAssertions;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Domain.Tests;

public sealed class WorkspaceInvitationLinkTests
{
    private static readonly DateTime CreatedAt = new(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc);
    private static readonly Guid WorkspaceId = Guid.NewGuid();
    private static readonly Guid IssuerMemberId = Guid.NewGuid();

    [Fact]
    public void Link_StoresHashAndStartsUsableWithVersionOne()
    {
        var link = NewLink();
        link.TokenHash.Should().Be(new string('a', 64));
        link.Version.Should().Be(1);
        link.IsUsableAt(CreatedAt).Should().BeTrue();
        link.IsUsableAt(CreatedAt.AddDays(7)).Should().BeFalse();
        link.ConsumedAt.Should().BeNull();
        link.ConsumedByUserId.Should().BeNull();
        link.RevokedAt.Should().BeNull();
    }

    [Fact]
    public void IsUsableAt_RequiresUtcComparisonTime()
    {
        var link = NewLink();
        var localTime = () => link.IsUsableAt(DateTime.SpecifyKind(CreatedAt, DateTimeKind.Local));
        localTime.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Consume_RecordsFirstExplicitAccepterAndAdvancesVersion()
    {
        var link = NewLink();
        var user = Guid.NewGuid();
        link.Consume(user, CreatedAt.AddDays(1));
        link.ConsumedAt.Should().Be(CreatedAt.AddDays(1));
        link.ConsumedByUserId.Should().Be(user);
        link.Version.Should().Be(2);
        link.IsUsableAt(CreatedAt.AddDays(1)).Should().BeFalse();
        var secondUse = () => link.Consume(Guid.NewGuid(), CreatedAt.AddDays(1));
        secondUse.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Revoke_IsTerminalAndAdvancesVersion()
    {
        var link = NewLink();
        link.Revoke(CreatedAt.AddHours(1));
        link.RevokedAt.Should().Be(CreatedAt.AddHours(1));
        link.Version.Should().Be(2);
        link.IsUsableAt(CreatedAt.AddHours(1)).Should().BeFalse();
        var repeat = () => link.Revoke(CreatedAt.AddHours(2));
        repeat.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Link_RejectsInvalidIdentityHashAndLifetime()
    {
        var empty = () => new WorkspaceInvitationLink(Guid.Empty, WorkspaceId, IssuerMemberId, new string('a', 64),
            CreatedAt, CreatedAt.AddDays(7));
        var malformedHash = () => new WorkspaceInvitationLink(Guid.NewGuid(), WorkspaceId, IssuerMemberId, "raw-token",
            CreatedAt, CreatedAt.AddDays(7));
        var localTime = () => new WorkspaceInvitationLink(Guid.NewGuid(), WorkspaceId, IssuerMemberId, new string('a', 64),
            DateTime.SpecifyKind(CreatedAt, DateTimeKind.Local), CreatedAt.AddDays(7));
        var nonPositiveLifetime = () => new WorkspaceInvitationLink(Guid.NewGuid(), WorkspaceId, IssuerMemberId,
            new string('a', 64), CreatedAt, CreatedAt);
        empty.Should().Throw<ArgumentException>();
        malformedHash.Should().Throw<ArgumentException>();
        localTime.Should().Throw<ArgumentException>();
        nonPositiveLifetime.Should().Throw<ArgumentException>();
    }

    private static WorkspaceInvitationLink NewLink() =>
        new(Guid.NewGuid(), WorkspaceId, IssuerMemberId, new string('a', 64), CreatedAt, CreatedAt.AddDays(7));
}
