using Lending.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Lending.Infrastructure.Configurations;

internal sealed class PaymentAllocationConfiguration : IEntityTypeConfiguration<PaymentAllocation>
{
    public void Configure(EntityTypeBuilder<PaymentAllocation> builder)
    {
        builder.ToTable("payment_allocations");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id");

        builder.Property(a => a.PaymentId).HasColumnName("payment_id").IsRequired();
        builder.Property(a => a.InstallmentId).HasColumnName("installment_id").IsRequired();
        builder.Property(a => a.ToLateInterest).HasColumnName("to_late_interest").HasPrecision(20, 6).IsRequired();
        builder.Property(a => a.ToInterest).HasColumnName("to_interest").HasPrecision(20, 6).IsRequired();
        builder.Property(a => a.ToPrincipal).HasColumnName("to_principal").HasPrecision(20, 6).IsRequired();

        builder.HasIndex(a => a.PaymentId);
        builder.HasIndex(a => a.InstallmentId);
    }
}
