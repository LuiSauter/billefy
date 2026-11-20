using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Budgets;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class SharedBudgetConfiguration : IEntityTypeConfiguration<SharedBudget>
{
    public void Configure(EntityTypeBuilder<SharedBudget> builder)
    {
        builder.ToTable("shared_budgets");
        builder.HasKey(b => new { b.WorkspaceId, b.Year, b.Month });
        builder.Property(b => b.WorkspaceId).HasColumnName("workspace_id");
        builder.Property(b => b.Year).HasColumnName("year");
        builder.Property(b => b.Month).HasColumnName("month");
        builder.ComplexProperty(b => b.TotalBudgetedAmount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("total_budgeted_amount").HasPrecision(20, 6).IsRequired();
            money.Property(m => m.Currency).HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2)).HasMaxLength(10).IsRequired();
        });
        builder.Ignore(b => b.Currency);
        builder.HasOne<Workspace>().WithMany().HasForeignKey(b => b.WorkspaceId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(b => b.Categories).WithOne()
            .HasForeignKey("WorkspaceId", "Year", "Month").OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(b => b.Categories).HasField("_categories")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
