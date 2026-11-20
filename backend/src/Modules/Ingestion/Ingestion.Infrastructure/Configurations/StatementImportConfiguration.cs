using Ingestion.Domain.Imports;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ingestion.Infrastructure.Configurations;

internal sealed class StatementImportConfiguration : IEntityTypeConfiguration<StatementImport>
{
    public void Configure(EntityTypeBuilder<StatementImport> builder)
    {
        builder.ToTable("imports");

        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasColumnName("id");

        builder.Property(i => i.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(i => i.AccountId).HasColumnName("account_id").IsRequired();
        builder.Property(i => i.Format).HasColumnName("format").HasMaxLength(20).IsRequired();
        builder.Property(i => i.FileName).HasColumnName("file_name").HasMaxLength(255).IsRequired();
        builder.Property(i => i.FileHash).HasColumnName("file_hash").HasMaxLength(64).IsRequired();
        builder.Property(i => i.Status).HasColumnName("status").HasMaxLength(30).IsRequired();
        builder.Property(i => i.SummaryJson).HasColumnName("summary_json");
        builder.Property(i => i.CreatedAt).HasColumnName("created_at").IsRequired();

        // Unique index for technical deduplication of statement files (ING-11)
        builder.HasIndex(i => new { i.UserId, i.FileHash }).IsUnique();
        builder.HasIndex(i => new { i.UserId, i.AccountId });
    }
}
