using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Planning.Domain.Goals;

namespace Planning.Infrastructure.Configurations;

internal sealed class GoalFundingEntryConfiguration : IEntityTypeConfiguration<GoalFundingEntry>
{
    public void Configure(EntityTypeBuilder<GoalFundingEntry> b)
    {
        b.ToTable("goal_funding_entries");
        b.HasKey(e => e.Id);
        b.Property(e => e.SignedAmount).HasPrecision(28, 8);
        b.Property(e => e.Currency).HasMaxLength(10).IsRequired();
        b.Property(e => e.OccurredAt).HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        b.Property(e => e.CreatedAt).HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        b.HasIndex(e => new { e.UserId, e.IdempotencyKey }).IsUnique();
        b.HasIndex(e => new { e.UserId, e.AccountId });
        b.HasOne<Goal>().WithMany().HasForeignKey(e => e.GoalId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class GoalFundingAccountConfiguration : IEntityTypeConfiguration<GoalFundingAccount>
{
    public void Configure(EntityTypeBuilder<GoalFundingAccount> b)
    {
        b.ToTable("goal_funding_accounts");
        b.HasKey(e => new { e.UserId, e.AccountId });
        b.Property(e => e.Revision).IsConcurrencyToken();
    }
}
