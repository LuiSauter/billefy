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
        modelBuilder.HasDefaultSchema("notifications");

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
        builder.Property(dt => dt.UserId).IsRequired();
        builder.Property(dt => dt.Token).HasMaxLength(500).IsRequired();
        builder.HasIndex(dt => dt.Token).IsUnique();

        builder.Property(dt => dt.Platform).HasMaxLength(50).IsRequired();
        builder.Property(dt => dt.CreatedAt).IsRequired();
        builder.Property(dt => dt.LastActiveAt).IsRequired();
        builder.Property(dt => dt.IsActive).IsRequired();

        builder.HasIndex(dt => dt.UserId);
    }
}

public sealed class NotificationLogConfiguration : IEntityTypeConfiguration<NotificationLog>
{
    public void Configure(EntityTypeBuilder<NotificationLog> builder)
    {
        builder.ToTable("notification_logs");

        builder.HasKey(nl => nl.Id);
        builder.Property(nl => nl.UserId).IsRequired();
        builder.Property(nl => nl.Type).IsRequired();
        builder.Property(nl => nl.Channel).HasMaxLength(50).IsRequired();
        builder.Property(nl => nl.Title).HasMaxLength(255).IsRequired();
        builder.Property(nl => nl.Body).HasMaxLength(2000).IsRequired();
        builder.Property(nl => nl.Status).HasMaxLength(50).IsRequired();
        builder.Property(nl => nl.ErrorDetails).HasMaxLength(2000);
        builder.Property(nl => nl.CreatedAt).IsRequired();

        builder.HasIndex(nl => nl.UserId);
    }
}
