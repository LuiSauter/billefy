using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Goals;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class SharedGoalConfiguration : IEntityTypeConfiguration<SharedGoal>
{
    public void Configure(EntityTypeBuilder<SharedGoal> builder)
    {
        builder.ToTable("shared_goals");
        builder.HasKey(g => g.Id);
        builder.Property(g => g.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(g => g.WorkspaceId).HasColumnName("workspace_id").IsRequired();
        builder.Property(g => g.Title).HasColumnName("title").HasMaxLength(150).IsRequired();
        builder.Property(g => g.Category).HasColumnName("category");
        builder.ComplexProperty(g => g.TargetAmount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("target_amount").HasPrecision(20, 6).IsRequired();
            money.Property(m => m.Currency).HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2)).HasMaxLength(10).IsRequired();
        });
        builder.ComplexProperty(g => g.MonthlyCommitmentAmount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("monthly_commitment_amount").HasPrecision(20, 6).IsRequired();
            money.Property(m => m.Currency).HasColumnName("monthly_commitment_currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2)).HasMaxLength(10).IsRequired();
        });
        builder.Ignore(g => g.Currency);
        builder.Ignore(g => g.CurrentAmount);
        builder.Property(g => g.TargetDate).HasColumnName("target_date");
        builder.Property(g => g.Status).HasColumnName("status")
            .HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.HasAlternateKey(g => new { g.Id, g.WorkspaceId });
        builder.HasIndex(g => new { g.WorkspaceId, g.Status });
        builder.HasOne<Workspace>().WithMany().HasForeignKey(g => g.WorkspaceId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(g => g.MemberContributions).WithOne()
            .HasForeignKey("GoalId", "WorkspaceId")
            .HasPrincipalKey(g => new { g.Id, g.WorkspaceId }).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(g => g.MemberContributions).HasField("_memberContributions")
            .UsePropertyAccessMode(PropertyAccessMode.Field).AutoInclude();
    }
}
