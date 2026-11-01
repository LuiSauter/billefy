using BuildingBlocks.Currencies;
using Lending.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Lending.Infrastructure.Configurations;

internal sealed class LoanConfiguration : IEntityTypeConfiguration<Loan>
{
    public void Configure(EntityTypeBuilder<Loan> builder)
    {
        builder.ToTable("loans");

        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasColumnName("id");

        builder.Property(l => l.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(l => l.CounterpartyId).HasColumnName("counterparty_id").IsRequired();
        builder.Property(l => l.DisbursementAccountId).HasColumnName("disbursement_account_id");
        builder.Property(l => l.DisbursementTransactionId).HasColumnName("disbursement_transaction_id");
        builder.Property(l => l.DisbursementReversalTransactionId).HasColumnName("disbursement_reversal_transaction_id");

        builder.Property(l => l.Type)
            .HasColumnName("type")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(l => l.Template)
            .HasColumnName("template")
            .HasConversion<string>()
            .HasMaxLength(40)
            .IsRequired();

        builder.Property(l => l.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        // ComplexProperty Principal
        builder.ComplexProperty(l => l.Principal, moneyBuilder =>
        {
            moneyBuilder.Property(m => m.Amount)
                .HasColumnName("principal_amount")
                .HasPrecision(20, 6)
                .IsRequired();

            moneyBuilder.Property(m => m.Currency)
                .HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2))
                .HasMaxLength(10)
                .IsRequired();
        });

        builder.Property(l => l.InterestRate).HasColumnName("interest_rate").HasPrecision(10, 6).IsRequired();
        builder.Property(l => l.RateUnit).HasColumnName("rate_unit").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(l => l.DayCount).HasColumnName("day_count").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(l => l.Frequency).HasColumnName("frequency").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(l => l.TotalInstallments).HasColumnName("total_installments").IsRequired();
        builder.Property(l => l.DisbursementDate).HasColumnName("disbursement_date").IsRequired();
        builder.Property(l => l.FirstDueDate).HasColumnName("first_due_date").IsRequired();
        builder.Property(l => l.LateRate).HasColumnName("late_rate").HasPrecision(10, 6);
        builder.Property(l => l.GraceDays).HasColumnName("grace_days").IsRequired();
        builder.Property(l => l.AllocationOrder).HasColumnName("allocation_order").HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(l => l.EarlyPaymentPolicy).HasColumnName("early_payment_policy").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(l => l.AnnualEffectiveRate).HasColumnName("annual_effective_rate").HasPrecision(10, 6).IsRequired();
        builder.Property(l => l.RemainingPrincipal).HasColumnName("remaining_principal").HasPrecision(20, 6).IsRequired();
        builder.Property(l => l.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(l => l.ActivatedAt).HasColumnName("activated_at");
        builder.Property(l => l.ClosedAt).HasColumnName("closed_at");

        builder.HasMany(l => l.Installments)
            .WithOne()
            .HasForeignKey(i => i.LoanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(l => l.Payments)
            .WithOne()
            .HasForeignKey(p => p.LoanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(l => new { l.UserId, l.Status });
        builder.HasIndex(l => new { l.UserId, l.CounterpartyId });
    }
}
