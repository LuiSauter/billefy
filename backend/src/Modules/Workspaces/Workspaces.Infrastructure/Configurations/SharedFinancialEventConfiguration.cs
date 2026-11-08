using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Events;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class SharedFinancialEventConfiguration : IEntityTypeConfiguration<SharedFinancialEvent>
{
    public void Configure(EntityTypeBuilder<SharedFinancialEvent> builder)
    {
        builder.ToTable("shared_financial_events");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(e => e.WorkspaceId).HasColumnName("workspace_id").IsRequired();
        builder.Property(e => e.Title).HasColumnName("title").HasMaxLength(150).IsRequired();
        builder.Property(e => e.FinancialEventType).HasColumnName("financial_event_type")
            .HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(e => e.DueDate).HasColumnName("due_date").IsRequired();
        builder.ComplexProperty(e => e.Amount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("amount").HasPrecision(20, 6).IsRequired();
            money.Property(m => m.Currency).HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2)).HasMaxLength(10).IsRequired();
        });
        builder.Ignore(e => e.Currency);
        builder.Property(e => e.ResponsibleMemberId).HasColumnName("responsible_member_id").IsRequired();
        builder.Property(e => e.Notes).HasColumnName("notes");
        builder.Property(e => e.IsCompleted).HasColumnName("is_completed").IsRequired();
        builder.HasIndex(e => new { e.WorkspaceId, e.DueDate });
        builder.HasOne<Workspace>().WithMany().HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<WorkspaceMember>().WithMany()
            .HasForeignKey(e => new { e.ResponsibleMemberId, e.WorkspaceId })
            .HasPrincipalKey(m => new { m.Id, m.WorkspaceId }).OnDelete(DeleteBehavior.Restrict);
    }
}
