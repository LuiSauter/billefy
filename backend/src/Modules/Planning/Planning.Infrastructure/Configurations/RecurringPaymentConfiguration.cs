using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Planning.Domain.Recurring;

namespace Planning.Infrastructure.Configurations;

internal sealed class RecurringPaymentConfiguration : IEntityTypeConfiguration<RecurringPayment>
{
    public void Configure(EntityTypeBuilder<RecurringPayment> builder)
    {
        builder.ToTable("recurring_payments");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");

        builder.Property(r => r.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(r => r.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
        builder.Property(r => r.Description).HasColumnName("description").HasMaxLength(500);

        builder.Property(r => r.FlowType)
            .HasColumnName("flow_type")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.ComplexProperty(r => r.Amount, moneyBuilder =>
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

        builder.Property(r => r.CategoryId).HasColumnName("category_id");
        builder.Property(r => r.DefaultAccountId).HasColumnName("default_account_id");

        builder.Property(r => r.Frequency)
            .HasColumnName("frequency")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(r => r.StartDate).HasColumnName("start_date").IsRequired();
        builder.Property(r => r.NextDueDate).HasColumnName("next_due_date").IsRequired();

        builder.Property(r => r.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(r => r.EndType)
            .HasColumnName("end_type")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(r => r.EndDate).HasColumnName("end_date");
        builder.Property(r => r.TotalOccurrences).HasColumnName("total_occurrences");
        builder.Property(r => r.CompletedOccurrences).HasColumnName("completed_occurrences").IsRequired();

        builder.Property(r => r.AutoCreateDraft).HasColumnName("auto_create_draft").IsRequired();
        builder.Property(r => r.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(r => new { r.UserId, r.NextDueDate });
        builder.HasIndex(r => new { r.UserId, r.Status });
    }
}
