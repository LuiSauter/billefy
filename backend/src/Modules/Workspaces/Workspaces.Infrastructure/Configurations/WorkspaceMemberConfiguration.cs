using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class WorkspaceMemberConfiguration : IEntityTypeConfiguration<WorkspaceMember>
{
    public void Configure(EntityTypeBuilder<WorkspaceMember> builder)
    {
        builder.ToTable("workspace_members");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(m => m.WorkspaceId).HasColumnName("workspace_id").IsRequired();
        builder.Property(m => m.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(m => m.WorkspaceRole).HasColumnName("workspace_role")
            .HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(m => m.IncomeSharePercentage).HasColumnName("income_share_percentage")
            .HasPrecision(20, 6).IsRequired();
        builder.Property(m => m.DefaultCustomSharePercentage).HasColumnName("default_custom_share_percentage")
            .HasPrecision(20, 6).HasDefaultValue(0m).IsRequired();
        builder.Property(m => m.DefaultResponsibilityWeight).HasColumnName("default_responsibility_weight")
            .HasPrecision(20, 6).HasDefaultValue(1m).IsRequired();
        builder.Property(m => m.JoinedAt).HasColumnName("joined_at").IsRequired();
        builder.Property(m => m.IsActive).HasColumnName("is_active").IsRequired();
        builder.Ignore(m => m.CanManage);
        builder.HasAlternateKey(m => new { m.Id, m.WorkspaceId });
        builder.HasIndex(m => new { m.WorkspaceId, m.UserId }).IsUnique();
        builder.HasIndex(m => new { m.WorkspaceId, m.IsActive });
        builder.HasIndex(m => new { m.UserId, m.IsActive });
        builder.HasOne<Workspace>().WithMany().HasForeignKey(m => m.WorkspaceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
