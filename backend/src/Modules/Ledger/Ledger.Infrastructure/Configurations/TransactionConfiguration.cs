using BuildingBlocks.Currencies;
using Ledger.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ledger.Infrastructure.Configurations;

internal sealed class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("transactions");
        builder.Ignore(transaction => transaction.CategoryAllocations);
        builder.HasMany<TransactionCategoryAllocation>("_categoryAllocations")
            .WithOne()
            .HasForeignKey(allocation => new { allocation.TransactionId, allocation.UserId })
            .HasPrincipalKey(transaction => new { transaction.Id, transaction.UserId })
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasKey(t => t.Id);
        builder.HasAlternateKey(t => new { t.Id, t.UserId });
        builder.Property(t => t.Id).HasColumnName("id");

        builder.Property(t => t.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(t => t.AccountId).HasColumnName("account_id").IsRequired();
        builder.Property(t => t.Direction).HasColumnName("direction").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(t => t.CategoryId).HasColumnName("category_id");
        builder.Property(t => t.LoanId).HasColumnName("loan_id");
        builder.Property(t => t.LoanCashKind).HasColumnName("loan_cash_kind").HasConversion<string>().HasMaxLength(20);
        builder.HasIndex(t => t.LoanId);
        builder.Property(t => t.OccurredAt).HasColumnName("occurred_at").IsRequired();
        builder.Property(t => t.Description).HasColumnName("description").HasMaxLength(500);
        builder.Property(t => t.ReversesId).HasColumnName("reverses_id");
        builder.Property(t => t.TransferId).HasColumnName("transfer_id");
        builder.Property(t => t.AppliedRate).HasColumnName("applied_rate").HasPrecision(20, 6);
        builder.Property(t => t.RateSource).HasColumnName("rate_source").HasMaxLength(50);
        builder.Property(t => t.WorkspaceSettlementId).HasColumnName("workspace_settlement_id");
        builder.HasIndex(t => t.WorkspaceSettlementId);
        builder.Property(t => t.InvestmentId).HasColumnName("investment_id");
        builder.Property(t => t.InvestmentCashKind).HasColumnName("investment_cash_kind").HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.IsReconciliationAdjustment).HasColumnName("is_reconciliation_adjustment").IsRequired();
        builder.Property(t => t.CreatedAt).HasColumnName("created_at").IsRequired();

        // Map Amount Money
        builder.ComplexProperty(t => t.Amount, moneyBuilder =>
        {
            moneyBuilder.Property(m => m.Amount)
                .HasColumnName("amount")
                .HasPrecision(20, 6)
                .IsRequired();

            moneyBuilder.Property(m => m.Currency)
                .HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2))
                .HasMaxLength(10)
                .IsRequired();
        });

        // Composite index for ultra-fast balance calculation (Index-Only Scan)
        builder.HasIndex(t => new { t.UserId, t.AccountId, t.OccurredAt });
        builder.HasIndex(t => new { t.UserId, t.OccurredAt });
        builder.HasIndex(t => new { t.UserId, t.CategoryId });
        builder.HasIndex(t => new { t.UserId, t.TransferId });
        builder.HasIndex(t => t.TransferId);
        builder.HasIndex(t => t.ReversesId)
            .IsUnique()
            .HasFilter("\"reverses_id\" IS NOT NULL");
    }
}
