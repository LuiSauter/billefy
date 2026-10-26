using Ingestion.Domain.FinancialSources;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ingestion.Infrastructure.Configurations;

internal sealed class FinancialSourceConfiguration : IEntityTypeConfiguration<FinancialSource>
{
    public void Configure(EntityTypeBuilder<FinancialSource> builder)
    {
        builder.ToTable("financial_sources");

        builder.HasKey(f => f.Id);
        builder.Property(f => f.Id).HasColumnName("id");

        builder.Property(f => f.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(f => f.SourceId).HasColumnName("source_id").HasMaxLength(255).IsRequired();
        builder.Property(f => f.Alias).HasColumnName("alias").HasMaxLength(100);
        builder.Property(f => f.Decision)
            .HasColumnName("decision")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(f => f.DecidedAt).HasColumnName("decided_at").IsRequired();
        builder.Property(f => f.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(f => new { f.UserId, f.SourceId }).IsUnique();
    }
}
