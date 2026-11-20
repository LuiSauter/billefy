using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Income;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class WorkspaceIncomeConfiguration : IEntityTypeConfiguration<WorkspaceIncome>
{
    public void Configure(EntityTypeBuilder<WorkspaceIncome> builder)
    {
        builder.ToTable("workspace_incomes");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(x => x.WorkspaceId).HasColumnName("workspace_id").IsRequired();
        builder.Property(x => x.Description).HasColumnName("description").IsRequired();
        builder.ComplexProperty(x => x.Amount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("amount").HasPrecision(20, 6).IsRequired();
            money.Property(m => m.Currency).HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2)).HasMaxLength(10).IsRequired();
        });
        builder.Ignore(x => x.Currency);
        builder.Property(x => x.ReceivedByMemberId).HasColumnName("received_by_member_id").IsRequired();
        builder.Property(x => x.Date).HasColumnName("date").IsRequired();
        builder.Property(x => x.CategoryId).HasColumnName("category_id");
        builder.Property(x => x.Notes).HasColumnName("notes");
        builder.Property(x => x.PersonalTransactionId).HasColumnName("personal_transaction_id");
        builder.Property(x => x.ReceivedToAccountId).HasColumnName("received_to_account_id");
        builder.Property(x => x.IdempotencyKey).HasColumnName("idempotency_key");
        builder.HasIndex(x => new { x.WorkspaceId, x.IdempotencyKey }).IsUnique()
            .HasFilter("idempotency_key IS NOT NULL");
        builder.HasIndex(x => x.PersonalTransactionId).IsUnique()
            .HasFilter("personal_transaction_id IS NOT NULL");
        builder.HasIndex(x => new { x.WorkspaceId, x.Date, x.Id });
        builder.HasIndex(x => new { x.WorkspaceId, x.CategoryId, x.Date });
        builder.HasIndex(x => new { x.WorkspaceId, x.ReceivedByMemberId, x.Date });
        builder.HasOne<Workspace>().WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<WorkspaceMember>().WithMany()
            .HasForeignKey(x => new { x.ReceivedByMemberId, x.WorkspaceId })
            .HasPrincipalKey(m => new { m.Id, m.WorkspaceId }).OnDelete(DeleteBehavior.Restrict);
    }
}
