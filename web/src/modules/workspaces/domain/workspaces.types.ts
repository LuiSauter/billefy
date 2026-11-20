export type WorkspaceType = "Couple" | "Roommates" | "Trip" | "Friends" | "Other";
export type WorkspaceRole = "Owner" | "Admin" | "Member";
export type SplitRuleType = "EqualParts" | "IncomeProportional" | "CustomPercentage" | "ByResponsibility";
export type SettlementStatus = "Pending" | "Completed";
export type SharedGoalStatus = "Active" | "Reached" | "Paused";
export type FinancialEventType = "Payment" | "Collection" | "GoalContribution" | "BudgetClose";
export type InvitationStatus = "Pending" | "Accepted" | "Rejected" | "Cancelled";

export interface WorkspaceSettings {
  hidePersonalPatrimony: boolean;
  memberSeesOnlyShared: boolean;
  showIndividualContributions: boolean;
  allowMovementComments: boolean;
  paymentReminders: boolean;
  weeklySummary: boolean;
  spaceNotifications: boolean;
}
export interface WorkspaceSummaryDto {
  id: string;
  name: string;
  workspaceType: WorkspaceType;
  baseCurrency: string;
  icon: string | null;
  color: string | null;
  role: WorkspaceRole;
}
export interface WorkspaceDetailDto extends Omit<WorkspaceSummaryDto, "role"> {
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  startDate: string;
  settings: WorkspaceSettings;
  members: WorkspaceMemberDto[];
  defaultSplitRule?: SplitRuleType;
  effectiveSplitRule?: SplitRuleType;
  isSplitConfigurationReady?: boolean;
}
export interface WorkspaceMemberDto {
  id: string;
  userId: string;
  workspaceRole: WorkspaceRole;
  incomeSharePercentage: number;
  joinedAt: string;
  isActive: boolean;
  customSharePercentage?: number;
  responsibilityWeight?: number;
}
export interface WorkspaceInvitationDto {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceRole: WorkspaceRole;
  expiresAt: string;
  status: InvitationStatus;
  plannedIncomeSharePercentage?: number;
  plannedCustomSharePercentage?: number;
  plannedResponsibilityWeight?: number;
}
export interface UpdateWorkspaceRequest {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
}
export interface CreateWorkspaceRequest extends UpdateWorkspaceRequest {
  workspaceType: WorkspaceType;
  baseCurrency: string;
  defaultSplitRule?: SplitRuleType;
  startDate?: string;
}
export interface SplitMemberConfigurationRequest { memberId: string; incomeSharePercentage: number; customSharePercentage: number; responsibilityWeight: number; }
export interface SplitInvitationConfigurationRequest { invitationId: string; incomeSharePercentage: number; customSharePercentage: number; responsibilityWeight: number; }
export interface UpdateSplitConfigurationRequest {
  defaultSplitRule: SplitRuleType;
  activeMembers: SplitMemberConfigurationRequest[];
  pendingInvitations: SplitInvitationConfigurationRequest[];
}
export type SplitConfigurationMemberDto = SplitMemberConfigurationRequest;
export interface SplitConfigurationInvitationDto extends SplitInvitationConfigurationRequest { email: string; }
export interface SplitConfigurationDto {
  defaultSplitRule: SplitRuleType;
  effectiveSplitRule: SplitRuleType;
  isSplitConfigurationReady: boolean;
  activeMembers: SplitConfigurationMemberDto[];
  pendingInvitations: SplitConfigurationInvitationDto[];
}
// Omitted settings use the server's true defaults; this is not a PATCH contract.
export type UpdateWorkspaceSettingsRequest = Partial<WorkspaceSettings>;
export interface InviteWorkspaceMemberRequest {
  email: string;
  workspaceRole?: WorkspaceRole;
  plannedIncomeSharePercentage?: number;
  plannedCustomSharePercentage?: number;
  plannedResponsibilityWeight?: number;
}
export interface UpdateWorkspaceMemberRoleRequest { workspaceRole: WorkspaceRole; }

export interface IssueWorkspaceInvitationLinkResponse {
  id: string;
  token: string;
  expiresAt: string;
}
export interface WorkspaceInvitationLinkPreviewDto {
  workspaceId: string;
  workspaceName: string;
  workspaceRole: "Member";
  expiresAt: string;
  alreadyMember: boolean;
}
export interface AcceptWorkspaceInvitationLinkResponse {
  workspaceId: string;
  membershipId: string;
}
export interface PreviewWorkspaceInvitationLinkRequest { token: string; }
export interface AcceptWorkspaceInvitationLinkRequest { token: string; }

// Numeric fields mirror JSON decimal values. These transport DTOs perform no money arithmetic.
export interface SplitParticipantRequest {
  memberId: string;
  customPercentage?: number;
  responsibilityWeight?: number;
}
export interface RegisterWorkspaceExpenseRequest {
  description: string;
  amount: number;
  currency: string;
  paidByMemberId: string;
  date: string;
  splitRuleType: SplitRuleType;
  participants: SplitParticipantRequest[];
  categoryId?: string | null;
  notes?: string | null;
}
export interface ExpenseSplitAllocationDto { memberId: string; amount: number; percentage: number; }
export interface WorkspaceExpenseDto extends Omit<RegisterWorkspaceExpenseRequest, "participants" | "categoryId" | "notes"> {
  id: string;
  workspaceId: string;
  categoryId: string | null;
  notes: string | null;
  allocations: ExpenseSplitAllocationDto[];
}
export interface WorkspaceExpenseFilter {
  from?: string;
  to?: string;
  categoryId?: string;
  paidByMemberId?: string;
  limit?: number;
  offset?: number;
}
export interface RegisterWorkspaceIncomeRequest {
  description: string;
  amount: number;
  currency: string;
  receivedByMemberId: string;
  date: string;
  categoryId?: string | null;
  notes?: string | null;
}
export interface WorkspaceIncomeDto extends RegisterWorkspaceIncomeRequest {
  id: string;
  workspaceId: string;
}
export interface WorkspaceIncomeFilter {
  from?: string;
  to?: string;
  categoryId?: string;
  receivedByMemberId?: string;
  limit?: number;
  offset?: number;
}
export interface PairwiseBalanceDto { debtorMemberId: string; creditorMemberId: string; amount: number; currency: string; }
export interface MemberNetBalanceDto { memberId: string; balance: number; currency: string; }
export interface SettleBalanceRequest {
  payerMemberId: string;
  receiverMemberId: string;
  amount: number;
  currency: string;
  settlementDate: string;
  notes?: string | null;
}
export interface WorkspaceSettlementDto extends Omit<SettleBalanceRequest, "notes"> {
  id: string;
  status: SettlementStatus;
  notes: string | null;
}
export interface WorkspaceBalancesDto {
  pairwiseBalances: PairwiseBalanceDto[];
  memberNetBalances: MemberNetBalanceDto[];
  settlements: WorkspaceSettlementDto[];
}
export interface SharedBudgetCategoryRequest { categoryId: string; limitAmount: number; }
export interface SetSharedBudgetRequest {
  year: number;
  month: number;
  amount: number;
  currency: string;
  categories: SharedBudgetCategoryRequest[];
}
export interface SharedBudgetCategoryDto extends SharedBudgetCategoryRequest { spentAmount: number; remainingAmount: number; }
export interface SharedBudgetDto extends SetSharedBudgetRequest {
  spentAmount: number;
  remainingAmount: number;
  executionPercentage: number;
  categories: SharedBudgetCategoryDto[];
}
export interface CreateSharedGoalRequest {
  title: string;
  targetAmount: number;
  currency: string;
  monthlyCommitmentAmount?: number;
  targetDate?: string | null;
  category?: string | null;
}
export interface ContributeSharedGoalRequest { amount: number; currency: string; }
export interface SharedGoalContributionDto { memberId: string; amount: number; contributedAt: string; }
export interface SharedGoalDto extends CreateSharedGoalRequest {
  id: string;
  currentAmount: number;
  monthlyCommitmentAmount: number;
  targetDate: string | null;
  category: string | null;
  status: SharedGoalStatus;
  memberContributions: SharedGoalContributionDto[];
}
export interface CreateSharedFinancialEventRequest {
  title: string;
  financialEventType: FinancialEventType;
  dueDate: string;
  amount: number;
  currency: string;
  responsibleMemberId: string;
  notes?: string | null;
}
export interface SharedFinancialEventDto extends Omit<CreateSharedFinancialEventRequest, "notes"> {
  id: string;
  isCompleted: boolean;
  notes: string | null;
  isDerived: boolean;
}
export interface WorkspaceCategoryBreakdownDto { categoryId: string | null; amount: number; percentage: number; }
export interface MemberContributionStatusDto {
  memberId: string;
  paidAmount: number;
  allocatedAmount: number;
  goalContributions: number;
  netBalance: number;
}
export interface WorkspaceMonthlyReportDto {
  year: number;
  month: number;
  currency: string;
  income: number;
  expenses: number;
  savings: number;
  previousMonthIncome: number;
  previousMonthExpenses: number;
  expenseChangePercentage: number | null;
  categoryBreakdown: WorkspaceCategoryBreakdownDto[];
}
export type PeriodComparisonDto = Pick<WorkspaceMonthlyReportDto, "previousMonthIncome" | "previousMonthExpenses" | "expenseChangePercentage">;
export type DashboardNextPaymentDto = SharedFinancialEventDto;
export interface WorkspaceDashboardDto {
  workspaceId: string;
  year: number;
  month: number;
  currency: string;
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
  budgetExecutionPercentage: number;
  categoryBreakdown: WorkspaceCategoryBreakdownDto[];
  memberContributions: MemberContributionStatusDto[];
  pendingSettlements: PairwiseBalanceDto[];
  balances: WorkspaceBalancesDto;
  budget: SharedBudgetDto | null;
}
export interface WorkspacePeriod { year?: number; month?: number; }
export interface WorkspaceDateRange { from?: string; to?: string; }

export interface IWorkspacesRepository {
  getWorkspaces(): Promise<WorkspaceSummaryDto[]>;
  getWorkspace(id: string): Promise<WorkspaceDetailDto>;
  createWorkspace(req: CreateWorkspaceRequest): Promise<{ id: string }>;
  updateWorkspace(id: string, req: UpdateWorkspaceRequest): Promise<void>;
  updateSettings(id: string, req: UpdateWorkspaceSettingsRequest): Promise<void>;
  getSplitConfiguration(id: string): Promise<SplitConfigurationDto>;
  updateSplitConfiguration(id: string, req: UpdateSplitConfigurationRequest): Promise<SplitConfigurationDto>;
  deactivateWorkspace(id: string): Promise<void>;
  inviteMember(id: string, req: InviteWorkspaceMemberRequest): Promise<WorkspaceInvitationDto>;
  issueInvitationLink(workspaceId: string): Promise<IssueWorkspaceInvitationLinkResponse>;
  previewInvitationLink(token: string): Promise<WorkspaceInvitationLinkPreviewDto>;
  acceptInvitationLink(token: string): Promise<AcceptWorkspaceInvitationLinkResponse>;
  revokeInvitationLink(workspaceId: string, linkId: string): Promise<void>;
  getPendingInvitations(): Promise<WorkspaceInvitationDto[]>;
  acceptInvitation(id: string): Promise<WorkspaceMemberDto>;
  rejectInvitation(id: string): Promise<void>;
  updateMemberRole(id: string, memberId: string, req: UpdateWorkspaceMemberRoleRequest): Promise<void>;
  removeMember(id: string, memberId: string): Promise<void>;
  getDashboard(id: string, period?: WorkspacePeriod): Promise<WorkspaceDashboardDto>;
  getExpenses(id: string, filter?: WorkspaceExpenseFilter): Promise<WorkspaceExpenseDto[]>;
  registerExpense(id: string, req: RegisterWorkspaceExpenseRequest): Promise<WorkspaceExpenseDto>;
  getIncomes(id: string, filter?: WorkspaceIncomeFilter): Promise<WorkspaceIncomeDto[]>;
  registerIncome(id: string, req: RegisterWorkspaceIncomeRequest): Promise<WorkspaceIncomeDto>;
  getBalances(id: string): Promise<WorkspaceBalancesDto>;
  getSettlements(id: string): Promise<WorkspaceSettlementDto[]>;
  settleBalance(id: string, req: SettleBalanceRequest): Promise<WorkspaceSettlementDto>;
  getBudget(id: string, period?: WorkspacePeriod): Promise<SharedBudgetDto | null>;
  setBudget(id: string, req: SetSharedBudgetRequest): Promise<SharedBudgetDto>;
  getGoals(id: string): Promise<SharedGoalDto[]>;
  createGoal(id: string, req: CreateSharedGoalRequest): Promise<SharedGoalDto>;
  contributeGoal(id: string, goalId: string, req: ContributeSharedGoalRequest): Promise<SharedGoalDto>;
  getCalendar(id: string, range?: WorkspaceDateRange): Promise<SharedFinancialEventDto[]>;
  createCalendarEvent(id: string, req: CreateSharedFinancialEventRequest): Promise<SharedFinancialEventDto>;
  getReports(id: string, period?: WorkspacePeriod): Promise<WorkspaceMonthlyReportDto>;
}
