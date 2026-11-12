using BuildingBlocks.Currencies;
using Lending.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Lending.Infrastructure.Configurations;

internal sealed class LoanPaymentConfiguration : IEntityTypeConfiguration<LoanPayment>
{
    public void Configure(EntityTypeBuilder<LoanPayment> builder)
    {
        builder.ToTable("payments");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");

        builder.Property(p => p.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(p => p.LoanId).HasColumnName("loan_id").IsRequired();
        builder.Property(p => p.AccountId).HasColumnName("account_id");
        builder.Property(p => p.LedgerTransactionId).HasColumnName("ledger_transaction_id");
        builder.Property(p => p.PaymentDate).HasColumnName("payment_date").IsRequired();
        builder.Property(p => p.Note).HasColumnName("note").HasMaxLength(500);
        builder.Property(p => p.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(p => p.RecordSequence).HasColumnName("record_sequence");
        builder.Property(p => p.CalculationVersion).HasColumnName("calculation_version");
        builder.Property(p => p.EarlyPrincipalAmount).HasColumnName("early_principal_amount").HasPrecision(20, 6);
        builder.Property(p => p.EarlyPrincipalEffectiveDate).HasColumnName("early_principal_effective_date");

        // ComplexProperty Amount
        builder.ComplexProperty(p => p.Amount, moneyBuilder =>
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

        builder.HasMany(p => p.Allocations)
            .WithOne()
            .HasForeignKey(a => a.PaymentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => p.LoanId);
        builder.HasIndex(p => new { p.UserId, p.LoanId });
        builder.HasIndex(p => new { p.LoanId, p.RecordSequence }).IsUnique();
    }
}
