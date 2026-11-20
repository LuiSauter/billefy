using BuildingBlocks.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Workspaces.Infrastructure;

namespace Api.DesignTime;

public sealed class WorkspacesDesignTimeDbContextFactory : IDesignTimeDbContextFactory<WorkspacesDbContext>
{
    public WorkspacesDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<WorkspacesDbContext>()
            .UseNpgsql()
            .Options;
        return new WorkspacesDbContext(options, new DesignTimeCurrentUserContext());
    }

    private sealed class DesignTimeCurrentUserContext : ICurrentUserContext
    {
        public Guid? UserId => null;
    }
}
