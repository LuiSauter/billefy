using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identity.Infrastructure;

public sealed class IdentityDbContext : DbContext
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("identity");

        modelBuilder.ApplyConfiguration(new UserConfiguration());
        modelBuilder.ApplyConfiguration(new RefreshTokenConfiguration());

        base.OnModelCreating(modelBuilder);
    }
}

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).HasMaxLength(255).IsRequired();
        builder.HasIndex(u => u.Email).IsUnique();

        builder.Property(u => u.FullName).HasMaxLength(255).IsRequired();
        builder.Property(u => u.PictureUrl).HasMaxLength(1000);
        builder.Property(u => u.PreferredCurrency).HasMaxLength(10).IsRequired();
        builder.Property(u => u.CreatedAt).IsRequired();
        builder.Property(u => u.LastLoginAt).IsRequired();
        builder.Property(u => u.IsDeleted).IsRequired();
        builder.Property(u => u.DeletionRequestedAt);
    }
}

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");

        builder.HasKey(rt => rt.Id);
        builder.Property(rt => rt.UserId).IsRequired();
        builder.Property(rt => rt.Token).HasMaxLength(500).IsRequired();
        builder.HasIndex(rt => rt.Token).IsUnique();

        builder.Property(rt => rt.ExpiresAt).IsRequired();
        builder.Property(rt => rt.CreatedAt).IsRequired();
        builder.Property(rt => rt.RevokedAt);
        builder.Property(rt => rt.ReplacedByToken).HasMaxLength(500);

        builder.HasIndex(rt => rt.UserId);
    }
}
