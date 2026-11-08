using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class WorkspaceInvitationLinkConfiguration : IEntityTypeConfiguration<WorkspaceInvitationLink>
{
    public void Configure(EntityTypeBuilder<WorkspaceInvitationLink> builder)
    {
        builder.ToTable("workspace_invitation_links");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.WorkspaceId).HasColumnName("workspace_id").IsRequired();
        builder.Property(x => x.IssuerMemberId).HasColumnName("issuer_member_id").IsRequired();
        builder.Property(x => x.TokenHash).HasColumnName("token_hash").HasMaxLength(64).IsRequired();
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(x => x.ExpiresAt).HasColumnName("expires_at").IsRequired();
        builder.Property(x => x.RevokedAt).HasColumnName("revoked_at");
        builder.Property(x => x.ConsumedAt).HasColumnName("consumed_at");
        builder.Property(x => x.ConsumedByUserId).HasColumnName("consumed_by_user_id");
        builder.Property(x => x.Version).HasColumnName("version").IsConcurrencyToken().IsRequired();
        builder.HasIndex(x => x.TokenHash).IsUnique();
        builder.HasIndex(x => new { x.WorkspaceId, x.CreatedAt });
        builder.HasOne<Workspace>().WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<WorkspaceMember>().WithMany().HasForeignKey(x => x.IssuerMemberId).OnDelete(DeleteBehavior.Restrict);
    }
}
