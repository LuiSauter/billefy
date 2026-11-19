using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Planning.Domain.Investments;

namespace Planning.Infrastructure.Configurations;

internal sealed class InvestmentTransactionConfiguration : IEntityTypeConfiguration<InvestmentTransaction>
{
    public void Configure(EntityTypeBuilder<InvestmentTransaction> builder)
    {
        builder.ToTable("investment_transactions");

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(t => t.InvestmentId).HasColumnName("investment_id").IsRequired();
        builder.Property(t => t.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(t => t.Quantity).HasColumnName("quantity").HasPrecision(28, 10).IsRequired();
        builder.Property(t => t.UnitPrice).HasColumnName("unit_price").HasPrecision(20, 6).IsRequired();
        builder.Property(t => t.TotalAmount).HasColumnName("total_amount").HasPrecision(20, 6).IsRequired();
        builder.Property(t => t.Fees).HasColumnName("fees").HasPrecision(20, 6).IsRequired().HasDefaultValue(0m);
        builder.Property(t => t.OccurredAt).HasColumnName("occurred_at").IsRequired();
        builder.Property(t => t.Notes).HasColumnName("notes").HasMaxLength(500);
        builder.Property(t => t.LedgerTransactionId).HasColumnName("ledger_transaction_id");
        builder.Property(t => t.PurchaseKey).HasColumnName("purchase_key");
        builder.Property(t => t.PurchasePayloadHash).HasColumnName("purchase_payload_hash").HasMaxLength(64);
        builder.HasIndex(t => new { t.UserId, t.PurchaseKey }).IsUnique().HasFilter("purchase_key IS NOT NULL");
        builder.Property(t => t.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(t => new { t.UserId, t.InvestmentId, t.OccurredAt });
        builder.HasIndex(t => t.LedgerTransactionId);

        builder.HasOne<Investment>()
            .WithMany()
            .HasForeignKey(t => new { t.InvestmentId, t.UserId })
            .HasPrincipalKey(i => new { i.Id, i.UserId })
            .OnDelete(DeleteBehavior.Cascade);
    }
}
