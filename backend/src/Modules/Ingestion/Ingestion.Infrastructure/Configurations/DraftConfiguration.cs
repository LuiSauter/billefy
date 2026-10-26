using BuildingBlocks.Currencies;
using Ingestion.Domain.Drafts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ingestion.Infrastructure.Configurations;

internal sealed class DraftConfiguration : IEntityTypeConfiguration<Draft>
{
    public void Configure(EntityTypeBuilder<Draft> builder)
    {
        builder.ToTable("drafts");

        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).HasColumnName("id");

        builder.Property(d => d.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(d => d.ImportId).HasColumnName("import_id");
        builder.Property(d => d.SuggestedAccountId).HasColumnName("suggested_account_id");
        builder.Property(d => d.SuggestedCategoryId).HasColumnName("suggested_category_id");
        builder.Property(d => d.ConfirmedAccountId).HasColumnName("confirmed_account_id");
        builder.Property(d => d.ConfirmedCategoryId).HasColumnName("confirmed_category_id");
        builder.Property(d => d.LedgerTransactionId).HasColumnName("ledger_transaction_id");

        builder.Property(d => d.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(d => d.Source)
            .HasColumnName("source")
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(d => d.Direction)
            .HasColumnName("direction")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        // Amount ComplexProperty
        builder.ComplexProperty(d => d.Amount, moneyBuilder =>
        {
            moneyBuilder.Property(m => m.Amount)
                .HasColumnName("amount")
                .HasPrecision(20, 6)
                .IsRequired();

            moneyBuilder.Property(m => m.Currency)
                .HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2))
                .HasMaxLength(10)
                .IsRequired();
        });

        builder.Property(d => d.EstimatedDate).HasColumnName("estimated_date").IsRequired();
        builder.Property(d => d.Reference).HasColumnName("reference").HasMaxLength(100);
        builder.Property(d => d.Fingerprint).HasColumnName("fingerprint").HasMaxLength(64).IsRequired();
        builder.Property(d => d.Confidence).HasColumnName("confidence").HasPrecision(3, 2).IsRequired();
        builder.Property(d => d.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(d => d.ConfirmedAt).HasColumnName("confirmed_at");
        builder.Property(d => d.DiscardedAt).HasColumnName("discarded_at");

        // Relations
        builder.HasMany(d => d.Events)
            .WithOne()
            .HasForeignKey(e => e.DraftId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes for performance and deduplication
        builder.HasIndex(d => new { d.UserId, d.Status });
        builder.HasIndex(d => new { d.UserId, d.Fingerprint });
        builder.HasIndex(d => new { d.UserId, d.Reference });
    }
}
