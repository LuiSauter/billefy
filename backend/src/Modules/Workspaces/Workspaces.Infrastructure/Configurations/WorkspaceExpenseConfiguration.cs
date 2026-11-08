using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Expenses;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class WorkspaceExpenseConfiguration : IEntityTypeConfiguration<WorkspaceExpense>
{
    public void Configure(EntityTypeBuilder<WorkspaceExpense> builder)
    {
        builder.ToTable("workspace_expenses");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(e => e.WorkspaceId).HasColumnName("workspace_id").IsRequired();
        builder.Property(e => e.Description).HasColumnName("description").IsRequired();
        builder.Property(e => e.CategoryId).HasColumnName("category_id");
        builder.ComplexProperty(e => e.TotalAmount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("total_amount").HasPrecision(20, 6).IsRequired();
            money.Property(m => m.Currency).HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2)).HasMaxLength(10).IsRequired();
        });
        builder.Ignore(e => e.Currency);
        builder.Property(e => e.PaidByMemberId).HasColumnName("paid_by_member_id").IsRequired();
        builder.Property(e => e.Date).HasColumnName("date").IsRequired();
        builder.Property(e => e.SplitRuleType).HasColumnName("split_rule_type")
            .HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(e => e.Notes).HasColumnName("notes");
        builder.Property(e => e.PersonalTransactionId).HasColumnName("personal_transaction_id");
        builder.Property(e => e.PaidFromAccountId).HasColumnName("paid_from_account_id");
        builder.HasAlternateKey(e => new { e.Id, e.WorkspaceId });
        builder.HasIndex(e => new { e.WorkspaceId, e.Date });
        builder.HasOne<Workspace>().WithMany().HasForeignKey(e => e.WorkspaceId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<WorkspaceMember>().WithMany()
            .HasForeignKey(e => new { e.PaidByMemberId, e.WorkspaceId })
            .HasPrincipalKey(m => new { m.Id, m.WorkspaceId }).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(e => e.Allocations).WithOne()
            .HasForeignKey("ExpenseId", "WorkspaceId")
            .HasPrincipalKey(e => new { e.Id, e.WorkspaceId }).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(e => e.Allocations).HasField("_allocations")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
