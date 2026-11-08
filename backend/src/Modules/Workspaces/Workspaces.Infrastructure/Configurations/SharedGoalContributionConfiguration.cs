using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Goals;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class SharedGoalContributionConfiguration : IEntityTypeConfiguration<SharedGoalContribution>
{
    public void Configure(EntityTypeBuilder<SharedGoalContribution> builder)
    {
        builder.ToTable("shared_goal_contributions");
        // A member may contribute more than once, including at the same timestamp.
        builder.Property<Guid>("Id").HasColumnName("id").ValueGeneratedOnAdd();
        builder.HasKey("Id");
        builder.Property<Guid>("GoalId").HasColumnName("goal_id");
        builder.Property<Guid>("WorkspaceId").HasColumnName("workspace_id");
        builder.Property(c => c.MemberId).HasColumnName("member_id").IsRequired();
        builder.ComplexProperty(c => c.Amount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("amount").HasPrecision(20, 6).IsRequired();
            money.Property(m => m.Currency).HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2)).HasMaxLength(10).IsRequired();
        });
        builder.Property(c => c.ContributedAt).HasColumnName("contributed_at").IsRequired();
        builder.HasIndex("GoalId", nameof(SharedGoalContribution.ContributedAt));
        builder.HasOne<WorkspaceMember>().WithMany()
            .HasForeignKey(nameof(SharedGoalContribution.MemberId), "WorkspaceId")
            .HasPrincipalKey(m => new { m.Id, m.WorkspaceId }).OnDelete(DeleteBehavior.Restrict);
    }
}
