using Ingestion.Domain.FinancialSources;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ingestion.Infrastructure.Configurations;

public class BinanceCredentialConfiguration : IEntityTypeConfiguration<BinanceCredential>
{
    public void Configure(EntityTypeBuilder<BinanceCredential> builder)
    {
        builder.ToTable("binance_credentials");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.UserId).HasColumnName("user_id").IsRequired();

        builder.Property(c => c.ApiKey)
            .HasColumnName("api_key")
            .HasMaxLength(256)
            .IsRequired();

        builder.Property(c => c.EncryptedApiSecret)
            .HasColumnName("encrypted_api_secret")
            .HasMaxLength(1024)
            .IsRequired();

        builder.Property(c => c.IsActive)
            .HasColumnName("is_active")
            .IsRequired();

        builder.Property(c => c.LastSyncedAt)
            .HasColumnName("last_synced_at");

        builder.Property(c => c.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(c => c.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();

        builder.HasIndex(c => c.UserId).IsUnique();
    }
}
