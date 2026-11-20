using BuildingBlocks.Security;
using Lending.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Api.DesignTime;

public sealed class LendingDesignTimeDbContextFactory : IDesignTimeDbContextFactory<LendingDbContext>
{
    public LendingDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<LendingDbContext>()
            .UseNpgsql()
            .Options;
        return new LendingDbContext(options, new DesignTimeCurrentUserContext());
    }

    private sealed class DesignTimeCurrentUserContext : ICurrentUserContext
    {
        public Guid? UserId => null;
    }
}
