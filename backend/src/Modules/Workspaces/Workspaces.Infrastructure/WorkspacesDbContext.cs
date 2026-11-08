using BuildingBlocks.Security;
using Microsoft.EntityFrameworkCore;
using Workspaces.Domain.Budgets;
using Workspaces.Domain.Events;
using Workspaces.Domain.Expenses;
using Workspaces.Domain.Goals;
using Workspaces.Domain.Income;
using Workspaces.Domain.Settlements;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Infrastructure;

public sealed class WorkspacesDbContext : DbContext
{
    public ICurrentUserContext CurrentUserContext { get; }

    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    public DbSet<WorkspaceInvitation> WorkspaceInvitations => Set<WorkspaceInvitation>();
    public DbSet<WorkspaceInvitationLink> WorkspaceInvitationLinks => Set<WorkspaceInvitationLink>();
    public DbSet<WorkspaceExpense> WorkspaceExpenses => Set<WorkspaceExpense>();
    public DbSet<WorkspaceIncome> WorkspaceIncomes => Set<WorkspaceIncome>();
    public DbSet<ExpenseSplitAllocation> ExpenseSplitAllocations => Set<ExpenseSplitAllocation>();
    public DbSet<WorkspaceSettlement> WorkspaceSettlements => Set<WorkspaceSettlement>();
    public DbSet<SharedBudget> SharedBudgets => Set<SharedBudget>();
    public DbSet<SharedBudgetCategory> SharedBudgetCategories => Set<SharedBudgetCategory>();
    public DbSet<SharedGoal> SharedGoals => Set<SharedGoal>();
    public DbSet<SharedGoalContribution> SharedGoalContributions => Set<SharedGoalContribution>();
    public DbSet<SharedFinancialEvent> SharedFinancialEvents => Set<SharedFinancialEvent>();

    public WorkspacesDbContext(
        DbContextOptions<WorkspacesDbContext> options,
        ICurrentUserContext currentUserContext) : base(options)
    {
        CurrentUserContext = currentUserContext ?? throw new ArgumentNullException(nameof(currentUserContext));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(WorkspacesDbContext).Assembly);

        // Shared aggregates have no owning UserId. Callers must authorize active workspace
        // membership before querying them; filtering by creator would hide shared resources.
    }
}
