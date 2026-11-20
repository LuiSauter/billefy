using BuildingBlocks.Security;
using Ledger.Infrastructure;
using Lending.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace Api.Tests;

internal sealed class LoanTransactionTestFactory : IAsyncDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private readonly TestUserContext userContext = new();

    public Guid UserId => userContext.UserId!.Value;
    public LendingDbContext LendingDb { get; private set; } = null!;
    public LedgerDbContext LedgerDb { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        await connection.OpenAsync();
        LendingDb = new LendingDbContext(new DbContextOptionsBuilder<LendingDbContext>().UseSqlite(connection).Options, userContext);
        LedgerDb = new LedgerDbContext(new DbContextOptionsBuilder<LedgerDbContext>().UseSqlite(connection).Options, userContext);

        await LedgerDb.Database.GetService<IRelationalDatabaseCreator>().CreateTablesAsync();
        await LendingDb.Database.GetService<IRelationalDatabaseCreator>().CreateTablesAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await LendingDb.DisposeAsync();
        await LedgerDb.DisposeAsync();
        await connection.DisposeAsync();
    }

    private sealed class TestUserContext : ICurrentUserContext
    {
        public Guid? UserId { get; } = Guid.NewGuid();
    }
}
