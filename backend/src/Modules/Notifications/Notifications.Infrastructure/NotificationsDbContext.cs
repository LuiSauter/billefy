using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Notifications.Domain.Entities;

namespace Notifications.Infrastructure;

public sealed class NotificationsDbContext : DbContext
{
    public NotificationsDbContext(DbContextOptions<NotificationsDbContext> options) : base(options)
    {
    }

    public DbSet<DeviceToken> DeviceTokens => Set<DeviceToken>();
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new DeviceTokenConfiguration());
        modelBuilder.ApplyConfiguration(new NotificationLogConfiguration());

        base.OnModelCreating(modelBuilder);
    }
}

public sealed class DeviceTokenConfiguration : IEntityTypeConfiguration<DeviceToken>
{
    public void Configure(EntityTypeBuilder<DeviceToken> builder)
    {
        builder.ToTable("device_tokens");

        builder.HasKey(dt => dt.Id);
        builder.Property(dt => dt.Id).HasColumnName("id");
        builder.Property(dt => dt.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(dt => dt.Token).HasColumnName("token").HasMaxLength(500).IsRequired();
        builder.HasIndex(dt => dt.Token).IsUnique();

        builder.Property(dt => dt.Platform).HasColumnName("platform").HasMaxLength(50).IsRequired();
        builder.Property(dt => dt.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(dt => dt.LastActiveAt).HasColumnName("last_active_at").IsRequired();
        builder.Property(dt => dt.IsActive).HasColumnName("is_active").IsRequired();

        builder.HasIndex(dt => dt.UserId);
    }
}

public sealed class NotificationLogConfiguration : IEntityTypeConfiguration<NotificationLog>
{
    public void Configure(EntityTypeBuilder<NotificationLog> builder)
    {
        builder.ToTable("notification_logs");

        builder.HasKey(nl => nl.Id);
        builder.Property(nl => nl.Id).HasColumnName("id");
        builder.Property(nl => nl.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(nl => nl.Type).HasColumnName("type").IsRequired();
        builder.Property(nl => nl.Channel).HasColumnName("channel").HasMaxLength(50).IsRequired();
        builder.Property(nl => nl.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
        builder.Property(nl => nl.Body).HasColumnName("body").HasMaxLength(2000).IsRequired();
        builder.Property(nl => nl.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
        builder.Property(nl => nl.ErrorDetails).HasColumnName("error_details").HasMaxLength(2000);
        builder.Property(nl => nl.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(nl => nl.UserId);
    }
}
