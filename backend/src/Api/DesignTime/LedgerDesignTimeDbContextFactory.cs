using BuildingBlocks.Security;
using Ledger.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Api.DesignTime;

public sealed class LedgerDesignTimeDbContextFactory : IDesignTimeDbContextFactory<LedgerDbContext>
{
    public LedgerDbContext CreateDbContext(string[] args)
    {
        // Offline model generation only; never load credentials or start the API.
        var options = new DbContextOptionsBuilder<LedgerDbContext>().UseNpgsql().Options;
        return new LedgerDbContext(options, new DesignTimeCurrentUserContext());
    }

    private sealed class DesignTimeCurrentUserContext : ICurrentUserContext
    {
        public Guid? UserId => null;
    }
}
