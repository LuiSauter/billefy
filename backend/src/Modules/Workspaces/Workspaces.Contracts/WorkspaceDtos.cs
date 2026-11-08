namespace Workspaces.Contracts;

public sealed record CreateWorkspaceRequest(string Name, WorkspaceType WorkspaceType, string BaseCurrency,
    string? Description = null, string? Icon = null, string? Color = null,
    SplitRuleType DefaultSplitRule = SplitRuleType.EqualParts, DateOnly? StartDate = null);
public sealed record CreateWorkspaceResponse(Guid Id);
public sealed record UpdateWorkspaceRequest(string Name, string? Description = null, string? Icon = null, string? Color = null);
public sealed record WorkspaceSettingsDto(bool HidePersonalPatrimony = true, bool MemberSeesOnlyShared = true,
    bool ShowIndividualContributions = true, bool AllowMovementComments = true, bool PaymentReminders = true,
    bool WeeklySummary = true, bool SpaceNotifications = true);
public sealed record UpdateWorkspaceSettingsRequest(bool HidePersonalPatrimony = true, bool MemberSeesOnlyShared = true,
    bool ShowIndividualContributions = true, bool AllowMovementComments = true, bool PaymentReminders = true,
    bool WeeklySummary = true, bool SpaceNotifications = true);
public sealed record WorkspaceSummaryDto(Guid Id, string Name, WorkspaceType WorkspaceType, string BaseCurrency,
    string? Icon, string? Color, WorkspaceRole Role);
public sealed record WorkspaceDetailsDto(Guid Id, string Name, string? Description, WorkspaceType WorkspaceType,
    string BaseCurrency, string? Icon, string? Color, bool IsActive, Guid CreatedBy, DateTime CreatedAt,
    WorkspaceSettingsDto Settings, IReadOnlyList<MemberDto> Members,
    DateOnly StartDate, SplitRuleType DefaultSplitRule = SplitRuleType.EqualParts, SplitRuleType EffectiveSplitRule = SplitRuleType.EqualParts,
    bool IsSplitConfigurationReady = true);
public sealed record MemberDto(Guid Id, Guid UserId, WorkspaceRole WorkspaceRole, decimal IncomeSharePercentage,
    DateTime JoinedAt, bool IsActive, decimal CustomSharePercentage = 0m, decimal ResponsibilityWeight = 1m);
public sealed record InviteMemberRequest(string Email, WorkspaceRole WorkspaceRole = WorkspaceRole.Member,
    decimal PlannedIncomeSharePercentage = 0m, decimal PlannedCustomSharePercentage = 0m,
    decimal PlannedResponsibilityWeight = 1m);
public sealed record WorkspaceInvitationDto(Guid Id, Guid WorkspaceId, string WorkspaceName,
    WorkspaceRole WorkspaceRole, DateTime ExpiresAt, InvitationStatus Status,
    decimal PlannedIncomeSharePercentage = 0m, decimal PlannedCustomSharePercentage = 0m,
    decimal PlannedResponsibilityWeight = 1m);
public sealed record SplitMemberConfigurationRequest(Guid MemberId, decimal IncomeSharePercentage,
    decimal CustomSharePercentage, decimal ResponsibilityWeight);
public sealed record SplitInvitationConfigurationRequest(Guid InvitationId, decimal IncomeSharePercentage,
    decimal CustomSharePercentage, decimal ResponsibilityWeight);
public sealed record UpdateSplitConfigurationRequest(SplitRuleType DefaultSplitRule,
    IReadOnlyList<SplitMemberConfigurationRequest> ActiveMembers,
    IReadOnlyList<SplitInvitationConfigurationRequest> PendingInvitations);
public sealed record SplitConfigurationMemberDto(Guid MemberId, decimal IncomeSharePercentage,
    decimal CustomSharePercentage, decimal ResponsibilityWeight);
public sealed record SplitConfigurationInvitationDto(Guid InvitationId, string Email,
    decimal IncomeSharePercentage, decimal CustomSharePercentage, decimal ResponsibilityWeight);
public sealed record SplitConfigurationDto(SplitRuleType DefaultSplitRule, SplitRuleType EffectiveSplitRule,
    bool IsSplitConfigurationReady, IReadOnlyList<SplitConfigurationMemberDto> ActiveMembers,
    IReadOnlyList<SplitConfigurationInvitationDto> PendingInvitations);
public sealed record AcceptInvitationRequest;
public sealed record RejectInvitationRequest;
public sealed record UpdateMemberRoleRequest(WorkspaceRole WorkspaceRole);

public sealed record SplitParticipantRequest(Guid MemberId, decimal CustomPercentage = 0m, decimal ResponsibilityWeight = 0m);
public sealed record RegisterWorkspaceExpenseRequest(string Description, decimal Amount, string Currency,
    Guid PaidByMemberId, DateOnly Date, SplitRuleType SplitRuleType, IReadOnlyList<SplitParticipantRequest> Participants,
    Guid? CategoryId = null, string? Notes = null, Guid? PaidFromAccountId = null);
// Expense edits/deletions are contracts only: financial records remain immutable until a reversal workflow exists.
public sealed record UpdateWorkspaceExpenseRequest(string Description, string? Notes = null);
public sealed record DeleteWorkspaceExpenseRequest(string Reason);
public sealed record WorkspaceExpenseFilter(DateOnly? From = null, DateOnly? To = null, Guid? CategoryId = null,
    Guid? PaidByMemberId = null, int Limit = 100, int Offset = 0);
public sealed record SplitAllocationDto(Guid MemberId, decimal Amount, decimal Percentage);
public sealed record WorkspaceExpenseDto(Guid Id, Guid WorkspaceId, string Description, Guid? CategoryId,
    decimal Amount, string Currency, Guid PaidByMemberId, DateOnly Date, SplitRuleType SplitRuleType,
    string? Notes, IReadOnlyList<SplitAllocationDto> Allocations, bool LinkedToLedger = false,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    Guid? PaidFromAccountId = null);
public sealed record RegisterWorkspaceIncomeRequest(string Description, decimal Amount, string Currency,
    Guid ReceivedByMemberId, DateOnly Date, Guid? CategoryId = null, string? Notes = null, Guid? ReceivedToAccountId = null);
public sealed record WorkspaceIncomeFilter(DateOnly? From = null, DateOnly? To = null, Guid? CategoryId = null,
    Guid? ReceivedByMemberId = null, int Limit = 100, int Offset = 0);
public sealed record WorkspaceIncomeDto(Guid Id, Guid WorkspaceId, string Description, Guid? CategoryId,
    decimal Amount, string Currency, Guid ReceivedByMemberId, DateOnly Date, string? Notes,
    bool LinkedToLedger = false,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    Guid? ReceivedToAccountId = null);
public sealed record LinkWorkspaceIncomeAccountRequest(Guid AccountId);
public sealed record LinkWorkspaceAccountRequest(Guid AccountId);
public sealed record WorkspaceAccountDto(Guid Id, string Name, string Currency, string Type);
public sealed record PairwiseBalanceDto(Guid DebtorMemberId, Guid CreditorMemberId, decimal Amount, string Currency);
public sealed record MemberNetBalanceDto(Guid MemberId, decimal Balance, string Currency);
public sealed record WorkspaceBalancesDto(IReadOnlyList<PairwiseBalanceDto> PairwiseBalances,
    IReadOnlyList<MemberNetBalanceDto> MemberNetBalances, IReadOnlyList<SettlementDto> Settlements);
public sealed record SettleBalanceRequest(Guid PayerMemberId, Guid ReceiverMemberId, decimal Amount,
    string Currency, DateOnly SettlementDate, string? Notes = null, Guid? PayerAccountId = null);
public sealed record SettlementDto(Guid Id, Guid PayerMemberId, Guid ReceiverMemberId, decimal Amount,
    string Currency, DateOnly SettlementDate, SettlementStatus Status, string? Notes,
    bool PayerLinked = false, bool ReceiverLinked = false);

public sealed record SharedBudgetCategoryRequest(Guid CategoryId, decimal LimitAmount);
public sealed record SetSharedBudgetRequest(int Year, int Month, decimal Amount, string Currency,
    IReadOnlyList<SharedBudgetCategoryRequest> Categories);
public sealed record SharedBudgetCategoryDto(Guid CategoryId, decimal LimitAmount, decimal SpentAmount, decimal RemainingAmount);
public sealed record SharedBudgetDto(int Year, int Month, decimal Amount, string Currency, decimal SpentAmount,
    decimal RemainingAmount, decimal ExecutionPercentage, IReadOnlyList<SharedBudgetCategoryDto> Categories);
public sealed record CreateSharedGoalRequest(string Title, decimal TargetAmount, string Currency,
    decimal MonthlyCommitmentAmount = 0m, DateOnly? TargetDate = null, string? Category = null);
public sealed record ContributeGoalRequest(decimal Amount, string Currency);
public sealed record SharedGoalContributionDto(Guid MemberId, decimal Amount, DateTime ContributedAt);
public sealed record SharedGoalDto(Guid Id, string Title, string? Category, decimal TargetAmount, decimal CurrentAmount,
    string Currency, DateOnly? TargetDate, decimal MonthlyCommitmentAmount, SharedGoalStatus Status,
    IReadOnlyList<SharedGoalContributionDto> MemberContributions);
public sealed record CreateSharedFinancialEventRequest(string Title, FinancialEventType FinancialEventType,
    DateOnly DueDate, decimal Amount, string Currency, Guid ResponsibleMemberId, string? Notes = null);
public sealed record SharedFinancialEventDto(Guid Id, string Title, FinancialEventType FinancialEventType,
    DateOnly DueDate, decimal Amount, string Currency, Guid ResponsibleMemberId, bool IsCompleted,
    string? Notes, bool IsDerived = false);
public sealed record WorkspaceCategoryBreakdownDto(Guid? CategoryId, decimal Amount, decimal Percentage);
public sealed record MemberContributionStatusDto(Guid MemberId, decimal PaidAmount, decimal AllocatedAmount,
    decimal GoalContributions, decimal NetBalance);
// Income and expenses are recorded shared cash flows; savings counts actual goal contributions in the selected month.
// Settlements and planned calendar collections are not income, expenses or savings.
public sealed record WorkspaceMonthlyReportDto(int Year, int Month, string Currency, decimal Income,
    decimal Expenses, decimal Savings, decimal PreviousMonthIncome, decimal PreviousMonthExpenses,
    decimal? ExpenseChangePercentage, IReadOnlyList<WorkspaceCategoryBreakdownDto> CategoryBreakdown);
// Balance is cumulative recorded shared income minus expenses, independent of the selected reporting month.
// Savings counts actual goal contributions in the selected month, not commitments.
public sealed record WorkspaceDashboardDto(Guid WorkspaceId, int Year, int Month, string Currency,
    decimal Balance, decimal MonthlyIncome, decimal MonthlyExpenses, decimal Savings,
    decimal BudgetExecutionPercentage, IReadOnlyList<WorkspaceCategoryBreakdownDto> CategoryBreakdown,
    IReadOnlyList<MemberContributionStatusDto> MemberContributions,
    IReadOnlyList<PairwiseBalanceDto> PendingSettlements, WorkspaceBalancesDto Balances, SharedBudgetDto? Budget);
