using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Planning.Domain.Budgets;

namespace Planning.Infrastructure.Configurations;

internal sealed class BudgetConfiguration : IEntityTypeConfiguration<Budget>
{
    public void Configure(EntityTypeBuilder<Budget> builder)
    {
        builder.ToTable("budgets");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id");

        builder.Property(b => b.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(b => b.CategoryId).HasColumnName("category_id");
        builder.Property(b => b.Period).HasColumnName("period").HasMaxLength(20).IsRequired();

        // ComplexProperty LimitAmount
        builder.ComplexProperty(b => b.LimitAmount, moneyBuilder =>
        {
            moneyBuilder.Property(m => m.Amount)
                .HasColumnName("limit_amount")
                .HasPrecision(20, 6)
                .IsRequired();

            moneyBuilder.Property(m => m.Currency)
                .HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2))
                .HasMaxLength(10)
                .IsRequired();
        });

        builder.Property(b => b.AlertThreshold).HasColumnName("alert_threshold").HasPrecision(3, 2).IsRequired();
        builder.Property(b => b.IsActive).HasColumnName("is_active").IsRequired();
        builder.Property(b => b.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(b => new { b.UserId, b.IsActive });
        builder.HasIndex(b => new { b.UserId, b.CategoryId });
    }
}
