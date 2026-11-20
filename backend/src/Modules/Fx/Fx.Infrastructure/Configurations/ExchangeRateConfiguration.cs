using BuildingBlocks.Currencies;
using Fx.Domain.Rates;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Fx.Infrastructure.Configurations;

internal sealed class ExchangeRateConfiguration : IEntityTypeConfiguration<ExchangeRate>
{
    public void Configure(EntityTypeBuilder<ExchangeRate> builder)
    {
        builder.ToTable("exchange_rates");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");

        builder.Property(r => r.Currency)
            .HasColumnName("currency")
            .HasConversion(c => c.Code, code => Currency.FromCode(code, 2))
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(r => r.BaseCurrency)
            .HasColumnName("base_currency")
            .HasConversion(c => c.Code, code => Currency.FromCode(code, 2))
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(r => r.BuyRate).HasColumnName("buy_rate").HasPrecision(20, 6).IsRequired();
        builder.Property(r => r.SellRate).HasColumnName("sell_rate").HasPrecision(20, 6).IsRequired();
        builder.Property(r => r.Source).HasColumnName("source").HasMaxLength(50).IsRequired();
        builder.Property(r => r.FetchedAt).HasColumnName("fetched_at").IsRequired();
        builder.Property(r => r.UserId).HasColumnName("user_id");

        // Indexes for fast rate lookup
        builder.HasIndex(r => new { r.Currency, r.BaseCurrency, r.FetchedAt });
        builder.HasIndex(r => new { r.UserId, r.Currency, r.BaseCurrency });
    }
}
