using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Expenses;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class ExpenseSplitAllocationConfiguration : IEntityTypeConfiguration<ExpenseSplitAllocation>
{
    public void Configure(EntityTypeBuilder<ExpenseSplitAllocation> builder)
    {
        builder.ToTable("expense_split_allocations");
        builder.Property<Guid>("ExpenseId").HasColumnName("expense_id");
        builder.Property<Guid>("WorkspaceId").HasColumnName("workspace_id");
        builder.Property(a => a.MemberId).HasColumnName("member_id").IsRequired();
        builder.HasKey("ExpenseId", nameof(ExpenseSplitAllocation.MemberId));
        builder.ComplexProperty(a => a.AllocatedAmount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("allocated_amount").HasPrecision(20, 6).IsRequired();
            money.Property(m => m.Currency).HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2)).HasMaxLength(10).IsRequired();
        });
        builder.Property(a => a.Percentage).HasColumnName("percentage").HasPrecision(20, 6).IsRequired();
        builder.HasOne<WorkspaceMember>().WithMany()
            .HasForeignKey(nameof(ExpenseSplitAllocation.MemberId), "WorkspaceId")
            .HasPrincipalKey(m => new { m.Id, m.WorkspaceId }).OnDelete(DeleteBehavior.Restrict);
    }
}
