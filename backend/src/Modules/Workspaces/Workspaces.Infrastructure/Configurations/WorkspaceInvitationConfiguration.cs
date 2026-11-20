using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class WorkspaceInvitationConfiguration : IEntityTypeConfiguration<WorkspaceInvitation>
{
    public void Configure(EntityTypeBuilder<WorkspaceInvitation> builder)
    {
        builder.ToTable("workspace_invitations");
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(i => i.WorkspaceId).HasColumnName("workspace_id").IsRequired();
        builder.Property(i => i.InvitedEmail).HasColumnName("invited_email").HasMaxLength(320).IsRequired();
        builder.Property(i => i.Token).HasColumnName("token").IsRequired();
        builder.Property(i => i.WorkspaceRole).HasColumnName("workspace_role")
            .HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(i => i.ExpiresAt).HasColumnName("expires_at").IsRequired();
        builder.Property(i => i.Status).HasColumnName("status")
            .HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(i => i.PlannedIncomeSharePercentage).HasColumnName("planned_income_share_percentage").HasPrecision(20, 6).HasDefaultValue(0m).IsRequired();
        builder.Property(i => i.PlannedCustomSharePercentage).HasColumnName("planned_custom_share_percentage").HasPrecision(20, 6).HasDefaultValue(0m).IsRequired();
        builder.Property(i => i.PlannedResponsibilityWeight).HasColumnName("planned_responsibility_weight").HasPrecision(20, 6).HasDefaultValue(1m).IsRequired();
        builder.HasIndex(i => i.Token).IsUnique();
        builder.HasIndex(i => new { i.WorkspaceId, i.Status });
        builder.HasOne<Workspace>().WithMany().HasForeignKey(i => i.WorkspaceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
