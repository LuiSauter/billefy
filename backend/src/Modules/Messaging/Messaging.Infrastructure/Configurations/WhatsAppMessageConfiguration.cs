using Messaging.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Messaging.Infrastructure.Configurations;

internal sealed class WhatsAppMessageConfiguration : IEntityTypeConfiguration<WhatsAppMessage>
{
    public void Configure(EntityTypeBuilder<WhatsAppMessage> builder)
    {
        builder.ToTable("whatsapp_messages");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id");

        builder.Property(m => m.LinkId).HasColumnName("link_id").IsRequired();
        builder.Property(m => m.ProviderMessageId).HasColumnName("provider_message_id").HasMaxLength(150).IsRequired();
        builder.Property(m => m.Direction).HasColumnName("direction").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(m => m.Text).HasColumnName("text").IsRequired();
        builder.Property(m => m.DraftId).HasColumnName("draft_id");
        builder.Property(m => m.CreatedAt).HasColumnName("created_at").IsRequired();

        // Unique index for webhook idempotency
        builder.HasIndex(m => m.ProviderMessageId).IsUnique();
        builder.HasIndex(m => m.LinkId);
    }
}
