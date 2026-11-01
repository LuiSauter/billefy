using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Planning.Domain.Investments;

namespace Planning.Infrastructure.Configurations;

internal sealed class InvestmentCashLinkConfiguration : IEntityTypeConfiguration<InvestmentCashLink>
{
    public void Configure(EntityTypeBuilder<InvestmentCashLink> builder)
    {
        builder.ToTable("investment_cash_links");
        builder.HasKey(link => link.Id);
        builder.Property(link => link.Id).HasColumnName("id");
        builder.Property(link => link.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(link => link.InvestmentId).HasColumnName("investment_id").IsRequired();
        builder.Property(link => link.LedgerTransactionId).HasColumnName("ledger_transaction_id").IsRequired();
        builder.Property(link => link.Kind).HasColumnName("kind").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(link => link.LinkedAt).HasColumnName("linked_at").IsRequired();
        builder.Property(link => link.ReversesLinkId).HasColumnName("reverses_link_id");
        builder.Property(link => link.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.HasIndex(link => link.LedgerTransactionId).IsUnique();
        builder.HasIndex(link => new { link.UserId, link.InvestmentId, link.LinkedAt });
        builder.HasOne<Investment>().WithMany().HasForeignKey(link => new { link.InvestmentId, link.UserId })
            .HasPrincipalKey(investment => new { investment.Id, investment.UserId }).OnDelete(DeleteBehavior.Restrict);
    }
}
