using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Workspaces.Domain.Budgets;

namespace Workspaces.Infrastructure.Configurations;

internal sealed class SharedBudgetCategoryConfiguration : IEntityTypeConfiguration<SharedBudgetCategory>
{
    public void Configure(EntityTypeBuilder<SharedBudgetCategory> builder)
    {
        builder.ToTable("shared_budget_categories");
        builder.Property<Guid>("WorkspaceId").HasColumnName("workspace_id");
        builder.Property<int>("Year").HasColumnName("year");
        builder.Property<int>("Month").HasColumnName("month");
        builder.Property(c => c.CategoryId).HasColumnName("category_id");
        builder.HasKey("WorkspaceId", "Year", "Month", nameof(SharedBudgetCategory.CategoryId));
        builder.ComplexProperty(c => c.LimitAmount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("limit_amount").HasPrecision(20, 6).IsRequired();
            money.Property(m => m.Currency).HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2)).HasMaxLength(10).IsRequired();
        });
    }
}
