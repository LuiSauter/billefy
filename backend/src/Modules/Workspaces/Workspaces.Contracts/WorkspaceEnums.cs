namespace Workspaces.Contracts;

public enum WorkspaceType
{
    Couple,
    Roommates,
    Trip,
    Friends,
    Other
}

public enum WorkspaceRole
{
    Owner,
    Admin,
    Member
}

public enum SplitRuleType
{
    EqualParts,
    IncomeProportional,
    CustomPercentage,
    ByResponsibility
}

public enum SettlementStatus
{
    Pending,
    Completed
}

public enum SharedGoalStatus
{
    Active,
    Reached,
    Paused
}

public enum FinancialEventType
{
    Payment,
    Collection,
    GoalContribution,
    BudgetClose
}

public enum InvitationStatus
{
    Pending,
    Accepted,
    Rejected,
    Cancelled
}
