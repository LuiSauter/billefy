using Ingestion.Domain.Drafts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ingestion.Infrastructure.Configurations;

internal sealed class DraftEventConfiguration : IEntityTypeConfiguration<DraftEvent>
{
    public void Configure(EntityTypeBuilder<DraftEvent> builder)
    {
        builder.ToTable("draft_events");

        builder.HasKey(e => new { e.DraftId, e.EventId });

        builder.Property(e => e.DraftId).HasColumnName("draft_id").IsRequired();
        builder.Property(e => e.EventId).HasColumnName("event_id").IsRequired();
        builder.Property(e => e.LinkedAt).HasColumnName("linked_at").IsRequired();
    }
}
