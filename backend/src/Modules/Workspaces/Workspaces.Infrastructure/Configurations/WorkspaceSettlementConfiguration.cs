using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Settlements;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class WorkspaceSettlementConfiguration : IEntityTypeConfiguration<WorkspaceSettlement>
{
    public void Configure(EntityTypeBuilder<WorkspaceSettlement> builder)
    {
        builder.ToTable("workspace_settlements");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(s => s.WorkspaceId).HasColumnName("workspace_id").IsRequired();
        builder.Property(s => s.PayerMemberId).HasColumnName("payer_member_id").IsRequired();
        builder.Property(s => s.ReceiverMemberId).HasColumnName("receiver_member_id").IsRequired();
        builder.ComplexProperty(s => s.Amount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("amount").HasPrecision(20, 6).IsRequired();
            money.Property(m => m.Currency).HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2)).HasMaxLength(10).IsRequired();
        });
        builder.Ignore(s => s.Currency);
        builder.Property(s => s.SettlementDate).HasColumnName("settlement_date").IsRequired();
        builder.Property(s => s.Status).HasColumnName("status")
            .HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(s => s.Notes).HasColumnName("notes");
        builder.Property(s => s.PayerTransactionId).HasColumnName("payer_transaction_id");
        builder.Property(s => s.ReceiverTransactionId).HasColumnName("receiver_transaction_id");
        builder.HasIndex(s => new { s.WorkspaceId, s.SettlementDate });
        builder.HasOne<Workspace>().WithMany().HasForeignKey(s => s.WorkspaceId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<WorkspaceMember>().WithMany()
            .HasForeignKey(s => new { s.PayerMemberId, s.WorkspaceId })
            .HasPrincipalKey(m => new { m.Id, m.WorkspaceId }).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<WorkspaceMember>().WithMany()
            .HasForeignKey(s => new { s.ReceiverMemberId, s.WorkspaceId })
            .HasPrincipalKey(m => new { m.Id, m.WorkspaceId }).OnDelete(DeleteBehavior.Restrict);
    }
}
