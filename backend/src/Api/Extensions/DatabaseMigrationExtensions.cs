using Fx.Infrastructure;
using Identity.Infrastructure;
using Ingestion.Infrastructure;
using Ledger.Infrastructure;
using Lending.Infrastructure;
using Messaging.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Notifications.Infrastructure;
using Planning.Infrastructure;
using Workspaces.Infrastructure;

namespace Api.Extensions;

public static class StartupDatabaseMigrations
{
    private static readonly (Type ContextType, Action<IServiceProvider, Action<DbContext>?> Migrate)[] Registry =
    [
        Register<LedgerDbContext>(),
        Register<FxDbContext>(),
        Register<IngestionDbContext>(),
        Register<LendingDbContext>(),
        Register<PlanningDbContext>(),
        Register<MessagingDbContext>(),
        Register<IdentityDbContext>(),
        Register<NotificationsDbContext>(),
        Register<WorkspacesDbContext>()
    ];

    public static IReadOnlyList<Type> ContextTypes { get; } = Registry.Select(entry => entry.ContextType).ToArray();

    public static void MigrateRelationalDatabases(IServiceProvider services, Action<DbContext>? migrate = null)
    {
        foreach (var entry in Registry)
        {
            entry.Migrate(services, migrate);
        }
    }

    private static (Type ContextType, Action<IServiceProvider, Action<DbContext>?> Migrate) Register<TContext>()
        where TContext : DbContext
    {
        return (typeof(TContext), MigrateContext<TContext>);
    }

    private static void MigrateContext<TContext>(IServiceProvider services, Action<DbContext>? migrate)
        where TContext : DbContext
    {
        var context = services.GetRequiredService<TContext>();
        if (!context.Database.IsRelational())
        {
            return;
        }

        if (migrate is null)
        {
            context.Database.Migrate();
        }
        else
        {
            migrate(context);
        }
    }
}
