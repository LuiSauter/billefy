using Ingestion.Domain.RawEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ingestion.Infrastructure.Configurations;

internal sealed class RawEventConfiguration : IEntityTypeConfiguration<RawEvent>
{
    public void Configure(EntityTypeBuilder<RawEvent> builder)
    {
        builder.ToTable("raw_events");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(e => e.EventId).HasColumnName("event_id").IsRequired();
        builder.Property(e => e.Channel).HasColumnName("channel").HasMaxLength(50).IsRequired();
        builder.Property(e => e.SourceId).HasColumnName("source_id").HasMaxLength(255);
        builder.Property(e => e.MaskedText).HasColumnName("masked_text");
        builder.Property(e => e.ReceivedAt).HasColumnName("received_at").IsRequired();
        builder.Property(e => e.PurgeAfter).HasColumnName("purge_after").IsRequired();
        builder.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();

        // Unique constraint for idempotency
        builder.HasIndex(e => new { e.UserId, e.EventId }).IsUnique();

        // Retention index
        builder.HasIndex(e => e.PurgeAfter);
    }
}
