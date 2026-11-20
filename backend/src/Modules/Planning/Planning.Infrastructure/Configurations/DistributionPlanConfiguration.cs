using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Planning.Domain.Distribution;

namespace Planning.Infrastructure.Configurations;

internal sealed class DistributionPlanConfiguration : IEntityTypeConfiguration<DistributionPlan>
{
    public void Configure(EntityTypeBuilder<DistributionPlan> builder)
    {
        builder.ToTable("distribution_plans");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(p => p.IsEnabled).HasColumnName("is_enabled").IsRequired();
        builder.Property(p => p.BucketsJson).HasColumnName("buckets_json").IsRequired();
        builder.Property(p => p.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(p => p.UserId).IsUnique();
    }
}
