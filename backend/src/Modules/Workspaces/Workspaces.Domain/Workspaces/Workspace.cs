using BuildingBlocks.Currencies;
using Workspaces.Contracts;
using Workspaces.Domain.Common;

namespace Workspaces.Domain.Workspaces;

public sealed class Workspace : AggregateRoot
{
    public string Name { get; }
    public string? Description { get; }
    public WorkspaceType WorkspaceType { get; }
    public Currency BaseCurrency { get; }
    public string? Icon { get; }
    public string? Color { get; }
    public bool IsActive { get; private set; } = true;
    public Guid CreatedBy { get; }
    public DateTime CreatedAt { get; }
    public DateOnly? StartDate { get; }
    public WorkspaceSettings Settings { get; }
    public SplitRuleType DefaultSplitRule { get; private set; } = SplitRuleType.EqualParts;

    private Workspace()
    {
        Name = null!;
        BaseCurrency = null!;
        Settings = null!;
    }

    public Workspace(Guid id, string name, WorkspaceType workspaceType, Currency baseCurrency,
        Guid createdBy, DateTime createdAt, string? description = null, string? icon = null,
        string? color = null, WorkspaceSettings? settings = null,
        SplitRuleType defaultSplitRule = SplitRuleType.EqualParts, DateOnly? startDate = null) : base(id)
    {
        Name = DomainGuard.Text(name, nameof(name));
        WorkspaceType = DomainGuard.Defined(workspaceType, nameof(workspaceType));
        BaseCurrency = baseCurrency ?? throw new ArgumentNullException(nameof(baseCurrency));
        CreatedBy = DomainGuard.Id(createdBy, nameof(createdBy));
        CreatedAt = createdAt;
        StartDate = startDate;
        Description = description;
        Icon = icon;
        Color = color;
        Settings = settings ?? new WorkspaceSettings();
        DefaultSplitRule = DomainGuard.Defined(defaultSplitRule, nameof(defaultSplitRule));
    }

    public void SetDefaultSplitRule(SplitRuleType rule) => DefaultSplitRule = DomainGuard.Defined(rule, nameof(rule));

    public void Deactivate() => IsActive = false;
}
