using BuildingBlocks.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Planning.Infrastructure;

namespace Api.DesignTime;

public sealed class PlanningDesignTimeDbContextFactory : IDesignTimeDbContextFactory<PlanningDbContext>
{
    public PlanningDbContext CreateDbContext(string[] args)
    {
        // Offline model generation only: no connection string or application startup.
        var options = new DbContextOptionsBuilder<PlanningDbContext>()
            .UseNpgsql()
            .Options;
        return new PlanningDbContext(options, new DesignTimeCurrentUserContext());
    }

    private sealed class DesignTimeCurrentUserContext : ICurrentUserContext
    {
        public Guid? UserId => null;
    }
}
