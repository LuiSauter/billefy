using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Ledger.Domain.Accounts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ledger.Infrastructure.Configurations;

internal sealed class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.ToTable("accounts");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id");

        builder.Property(a => a.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(a => a.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(a => a.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(a => a.IsArchived).HasColumnName("is_archived").HasDefaultValue(false);
        builder.Property(a => a.IconKey).HasColumnName("icon_key").HasMaxLength(30);
        builder.Property(a => a.ColorKey).HasColumnName("color_key").HasMaxLength(30);
        builder.Property(a => a.CreatedAt).HasColumnName("created_at").IsRequired();

        // Map Currency
        builder.Property(a => a.Currency)
            .HasColumnName("currency")
            .HasConversion(c => c.Code, code => Currency.FromCode(code, 2))
            .HasMaxLength(10)
            .IsRequired();

        // Map InitialBalance
        builder.ComplexProperty(a => a.InitialBalance, moneyBuilder =>
        {
            moneyBuilder.Property(m => m.Amount)
                .HasColumnName("initial_balance")
                .HasPrecision(20, 6)
                .IsRequired();

            moneyBuilder.Property(m => m.Currency)
                .HasColumnName("initial_balance_currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2))
                .HasMaxLength(10)
                .IsRequired();
        });

        builder.HasIndex(a => new { a.UserId, a.IsArchived });
    }
}
