using Ledger.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ledger.Infrastructure.Configurations;

internal sealed class TransactionCategoryAllocationConfiguration : IEntityTypeConfiguration<TransactionCategoryAllocation>
{
    public void Configure(EntityTypeBuilder<TransactionCategoryAllocation> builder)
    {
        builder.ToTable("transaction_category_allocations");
        builder.HasKey(allocation => allocation.Id);
        builder.Property(allocation => allocation.Id).HasColumnName("id");
        builder.Property(allocation => allocation.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(allocation => allocation.TransactionId).HasColumnName("transaction_id").IsRequired();
        builder.Property(allocation => allocation.CategoryId).HasColumnName("category_id").IsRequired();
        builder.Property(allocation => allocation.Amount).HasColumnName("amount").HasPrecision(20, 6).IsRequired();
        builder.Property(allocation => allocation.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.HasIndex(allocation => new { allocation.TransactionId, allocation.CategoryId }).IsUnique();
        builder.HasIndex(allocation => new { allocation.UserId, allocation.CategoryId });
        builder.HasOne<Ledger.Domain.Categories.Category>().WithMany()
            .HasForeignKey(allocation => new { allocation.CategoryId, allocation.UserId })
            .HasPrincipalKey(category => new { category.Id, category.UserId })
            .OnDelete(DeleteBehavior.Restrict);
    }
}
