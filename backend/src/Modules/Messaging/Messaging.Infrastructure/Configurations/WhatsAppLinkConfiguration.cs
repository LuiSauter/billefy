using Messaging.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Messaging.Infrastructure.Configurations;

internal sealed class WhatsAppLinkConfiguration : IEntityTypeConfiguration<WhatsAppLink>
{
    public void Configure(EntityTypeBuilder<WhatsAppLink> builder)
    {
        builder.ToTable("whatsapp_links");

        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasColumnName("id");

        builder.Property(l => l.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(l => l.PhoneNumber).HasColumnName("phone_number").HasMaxLength(30).IsRequired();
        builder.Property(l => l.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(l => l.VerificationCode).HasColumnName("verification_code").HasMaxLength(10).IsRequired();
        builder.Property(l => l.ConfirmedAt).HasColumnName("confirmed_at");
        builder.Property(l => l.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(l => l.PhoneNumber).IsUnique();
        builder.HasIndex(l => l.UserId);
    }
}
