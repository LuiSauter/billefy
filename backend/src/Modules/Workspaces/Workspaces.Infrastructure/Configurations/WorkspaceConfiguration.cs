using System.Text.Json;
using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class WorkspaceConfiguration : IEntityTypeConfiguration<Workspace>
{
    public void Configure(EntityTypeBuilder<Workspace> builder)
    {
        builder.ToTable("workspaces");
        builder.HasKey(w => w.Id);
        builder.Property(w => w.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(w => w.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
        builder.Property(w => w.Description).HasColumnName("description");
        builder.Property(w => w.WorkspaceType).HasColumnName("workspace_type")
            .HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(w => w.BaseCurrency).HasColumnName("base_currency")
            .HasConversion(c => c.Code, code => Currency.FromCode(code, 2))
            .HasMaxLength(10).IsRequired();
        builder.Property(w => w.Icon).HasColumnName("icon").HasMaxLength(100);
        builder.Property(w => w.Color).HasColumnName("color").HasMaxLength(30);
        builder.Property(w => w.DefaultSplitRule).HasColumnName("default_split_rule")
            .HasConversion<string>().HasMaxLength(30).HasDefaultValue(Workspaces.Contracts.SplitRuleType.EqualParts).IsRequired();
        builder.Property(w => w.IsActive).HasColumnName("is_active").IsRequired();
        builder.Property(w => w.CreatedBy).HasColumnName("created_by").IsRequired();
        builder.Property(w => w.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(w => w.StartDate).HasColumnName("start_date").HasColumnType("date");
        builder.Property(w => w.Settings).HasColumnName("settings").HasColumnType("jsonb")
            .HasConversion(
                settings => JsonSerializer.Serialize(settings, (JsonSerializerOptions?)null),
                json => JsonSerializer.Deserialize<WorkspaceSettings>(json, (JsonSerializerOptions?)null)!)
            .IsRequired();
        builder.HasIndex(w => new { w.CreatedBy, w.IsActive });
    }
}
