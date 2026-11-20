using Lending.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Lending.Infrastructure.Configurations;

internal sealed class LoanPurchaseConfiguration : IEntityTypeConfiguration<LoanPurchase>
{
    public void Configure(EntityTypeBuilder<LoanPurchase> builder)
    {
        builder.ToTable("loan_purchases");
        builder.HasKey(p => p.Id);
        // Purchases are appended with domain-assigned IDs, never generated-key updates.
        builder.Property(p => p.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(p => p.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(p => p.LoanId).HasColumnName("loan_id");
        builder.Property(p => p.InstallmentId).HasColumnName("installment_id");
        builder.Property(p => p.LedgerTransactionId).HasColumnName("ledger_transaction_id");
        builder.Property(p => p.Amount).HasColumnName("amount").HasPrecision(20, 6);
        builder.Property(p => p.OccurredAt).HasColumnName("occurred_at");
        builder.Property(p => p.CreatedAt).HasColumnName("created_at");
        builder.Property(p => p.CategoryId).HasColumnName("category_id");
        builder.Property(p => p.Description).HasColumnName("description").HasMaxLength(500);
        builder.Property(p => p.IdempotencyKey).HasColumnName("idempotency_key");
        builder.Property(p => p.Fingerprint).HasColumnName("fingerprint").HasMaxLength(64);
        builder.HasIndex(p => new { p.UserId, p.LoanId, p.IdempotencyKey }).IsUnique();
        builder.HasIndex(p => p.LedgerTransactionId).IsUnique();
    }
}
