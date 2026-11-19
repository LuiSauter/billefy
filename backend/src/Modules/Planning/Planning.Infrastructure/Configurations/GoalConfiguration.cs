using BuildingBlocks.Currencies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Planning.Domain.Goals;

namespace Planning.Infrastructure.Configurations;

internal sealed class GoalConfiguration : IEntityTypeConfiguration<Goal>
{
    public void Configure(EntityTypeBuilder<Goal> builder)
    {
        builder.ToTable("goals");

        builder.HasKey(g => g.Id);
        builder.Property(g => g.Id).HasColumnName("id");

        builder.Property(g => g.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(g => g.AccountId).HasColumnName("account_id");
        builder.Property(g => g.FundingRevision).HasColumnName("funding_revision").HasDefaultValue(0L).IsConcurrencyToken();
        builder.Property(g => g.FundingMode).HasColumnName("funding_mode")
            .HasConversion<int>().HasDefaultValue(GoalFundingMode.AccountTracking).IsRequired();
        builder.Property(g => g.Name).HasColumnName("name").HasMaxLength(150).IsRequired();

        // ComplexProperty TargetAmount
        builder.ComplexProperty(g => g.TargetAmount, moneyBuilder =>
        {
            moneyBuilder.Property(m => m.Amount)
                .HasColumnName("target_amount")
                .HasPrecision(20, 6)
                .IsRequired();

            moneyBuilder.Property(m => m.Currency)
                .HasColumnName("currency")
                .HasConversion(c => c.Code, code => Currency.FromCode(code, 2))
                .HasMaxLength(10)
                .IsRequired();
        });

        builder.Property(g => g.TargetDate).HasColumnName("target_date");
        builder.Property(g => g.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(g => new { g.UserId, g.Name });
    }
}
