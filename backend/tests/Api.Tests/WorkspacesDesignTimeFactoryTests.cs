using Api.DesignTime;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Workspaces.Domain.Workspaces;

namespace Api.Tests;

public sealed class WorkspacesDesignTimeFactoryTests
{
    [Fact]
    public void CreatesNpgsqlModelWithoutConnectionOrRuntimeUser()
    {
        using var context = new WorkspacesDesignTimeDbContextFactory().CreateDbContext([]);

        context.Database.ProviderName.Should().Be("Npgsql.EntityFrameworkCore.PostgreSQL");
        context.Database.GetConnectionString().Should().BeNull();
        context.Model.FindEntityType(typeof(Workspace))!.FindProperty(nameof(Workspace.StartDate))!
            .GetColumnType().Should().Be("date");
    }
}
