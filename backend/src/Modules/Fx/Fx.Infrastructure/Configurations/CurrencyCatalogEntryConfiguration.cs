using Fx.Domain.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Fx.Infrastructure.Configurations;

internal sealed class CurrencyCatalogEntryConfiguration : IEntityTypeConfiguration<CurrencyCatalogEntry>
{
    public void Configure(EntityTypeBuilder<CurrencyCatalogEntry> builder)
    {
        builder.ToTable("currency_catalog");
        builder.HasKey(entry => entry.Code);
        builder.Property(entry => entry.Code).HasColumnName("code").HasMaxLength(10).IsRequired();
        builder.Property(entry => entry.Name).HasColumnName("name").HasMaxLength(80).IsRequired();
        builder.Property(entry => entry.Symbol).HasColumnName("symbol").HasMaxLength(12).IsRequired();
        builder.Property(entry => entry.Precision).HasColumnName("precision").IsRequired();
        builder.Property(entry => entry.IsActive).HasColumnName("is_active").IsRequired();

        builder.HasData(
            new CurrencyCatalogEntry("BOB", "Boliviano", "Bs", 2, true),
            new CurrencyCatalogEntry("USD", "US Dollar", "$", 2, true),
            new CurrencyCatalogEntry("USDT", "Tether USD", "₮", 2, true),
            new CurrencyCatalogEntry("USDC", "USD Coin", "USDC", 2, true));
    }
}
