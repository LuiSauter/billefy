using Lending.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Lending.Infrastructure.Configurations;

internal sealed class LoanInstallmentConfiguration : IEntityTypeConfiguration<LoanInstallment>
{
    public void Configure(EntityTypeBuilder<LoanInstallment> builder)
    {
        builder.ToTable("installments");

        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasColumnName("id");

        builder.Property(i => i.LoanId).HasColumnName("loan_id").IsRequired();
        builder.Property(i => i.Number).HasColumnName("number").IsRequired();
        builder.Property(i => i.DueDate).HasColumnName("due_date").IsRequired();
        builder.Property(i => i.ExpectedPrincipal).HasColumnName("expected_principal").HasPrecision(20, 6).IsRequired();
        builder.Property(i => i.ExpectedInterest).HasColumnName("expected_interest").HasPrecision(20, 6).IsRequired();
        builder.Property(i => i.ExpectedTotal).HasColumnName("expected_total").HasPrecision(20, 6).IsRequired();
        builder.Property(i => i.PaidPrincipal).HasColumnName("paid_principal").HasPrecision(20, 6).IsRequired();
        builder.Property(i => i.PaidInterest).HasColumnName("paid_interest").HasPrecision(20, 6).IsRequired();
        builder.Property(i => i.PaidLateInterest).HasColumnName("paid_late_interest").HasPrecision(20, 6).IsRequired();
        builder.Property(i => i.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(25)
            .IsRequired();

        builder.HasIndex(i => new { i.LoanId, i.Number }).IsUnique();
        builder.HasIndex(i => new { i.LoanId, i.DueDate });
    }
}
