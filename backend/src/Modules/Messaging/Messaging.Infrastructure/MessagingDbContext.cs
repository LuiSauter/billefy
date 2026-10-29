using BuildingBlocks.Security;
using Messaging.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Messaging.Infrastructure;

public class MessagingDbContext : DbContext
{
    private readonly ICurrentUserContext _currentUserContext;

    public DbSet<WhatsAppLink> Links => Set<WhatsAppLink>();
    public DbSet<WhatsAppMessage> Messages => Set<WhatsAppMessage>();

    public MessagingDbContext(
        DbContextOptions<MessagingDbContext> options,
        ICurrentUserContext currentUserContext)
        : base(options)
    {
        _currentUserContext = currentUserContext ?? throw new ArgumentNullException(nameof(currentUserContext));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MessagingDbContext).Assembly);

        // Global query filters for user_id multi-tenancy isolation (fail-closed)
        modelBuilder.Entity<WhatsAppLink>().HasQueryFilter(l => _currentUserContext.IsAuthenticated && l.UserId == _currentUserContext.UserId.GetValueOrDefault());
    }
}
