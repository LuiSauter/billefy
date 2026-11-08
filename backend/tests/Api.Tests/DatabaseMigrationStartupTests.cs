using Api.Extensions;
using FluentAssertions;
using Fx.Infrastructure;
using Identity.Infrastructure;
using Ingestion.Infrastructure;
using Ledger.Infrastructure;
using Lending.Infrastructure;
using Messaging.Infrastructure;
using Notifications.Infrastructure;
using Planning.Infrastructure;
using Workspaces.Infrastructure;

namespace Api.Tests;

public sealed class DatabaseMigrationStartupTests
{
    [Fact]
    public void StartupMigrationRegistry_IncludesEveryRegisteredModuleContextExactlyOnce()
    {
        StartupDatabaseMigrations.ContextTypes.Should().BeEquivalentTo(
        [
            typeof(LedgerDbContext),
            typeof(FxDbContext),
            typeof(IngestionDbContext),
            typeof(LendingDbContext),
            typeof(PlanningDbContext),
            typeof(MessagingDbContext),
            typeof(IdentityDbContext),
            typeof(NotificationsDbContext),
            typeof(WorkspacesDbContext)
        ], options => options.WithStrictOrdering());
    }
}
