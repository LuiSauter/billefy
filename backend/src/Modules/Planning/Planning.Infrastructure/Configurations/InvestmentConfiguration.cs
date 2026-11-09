using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Planning.Domain.Investments;

namespace Planning.Infrastructure.Configurations;

internal sealed class InvestmentConfiguration : IEntityTypeConfiguration<Investment>
{
    public void Configure(EntityTypeBuilder<Investment> builder)
    {
        builder.ToTable("investments");

        builder.HasKey(i => i.Id);
        builder.HasAlternateKey(i => new { i.Id, i.UserId });
        builder.Property(i => i.Id).HasColumnName("id");
        builder.Property(i => i.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(i => i.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
        builder.Property(i => i.Ticker).HasColumnName("ticker").HasMaxLength(20);
        builder.Property(i => i.Kind).HasColumnName("kind").HasMaxLength(30).IsRequired();
        builder.Property(i => i.IconKey).HasColumnName("icon_key").HasMaxLength(30).IsRequired();
        builder.Property(i => i.ColorKey).HasColumnName("color_key").HasMaxLength(30).IsRequired();
        builder.Property(i => i.Currency).HasColumnName("currency").HasMaxLength(10).IsRequired();
        builder.Property(i => i.Quantity).HasColumnName("quantity").HasPrecision(28, 10).IsRequired();
        builder.Property(i => i.InitialValue).HasColumnName("initial_value").HasPrecision(20, 6).IsRequired();
        builder.Property(i => i.CurrentValue).HasColumnName("current_value").HasPrecision(20, 6).IsRequired();
        builder.Property(i => i.HistoryJson).HasColumnName("history_json").IsRequired();
        builder.Property(i => i.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(i => i.ArchivedAt).HasColumnName("archived_at");

        builder.HasIndex(i => new { i.UserId, i.CreatedAt });
    }
}
