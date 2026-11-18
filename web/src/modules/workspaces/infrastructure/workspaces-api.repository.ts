import { IHttpClient } from "@/shared/application/http-client.contract";
import {
  ContributeSharedGoalRequest, CreateSharedFinancialEventRequest, CreateSharedGoalRequest,
  CreateWorkspaceRequest, InviteWorkspaceMemberRequest, IWorkspacesRepository,
  RegisterWorkspaceExpenseRequest, SetSharedBudgetRequest, SettleBalanceRequest,
  SharedBudgetDto, SharedFinancialEventDto, SharedGoalDto, UpdateWorkspaceMemberRoleRequest,
  UpdateWorkspaceRequest, UpdateWorkspaceSettingsRequest, WorkspaceBalancesDto,
  AcceptWorkspaceInvitationLinkResponse, IssueWorkspaceInvitationLinkResponse,
  PreviewWorkspaceInvitationLinkRequest, AcceptWorkspaceInvitationLinkRequest,
  WorkspaceInvitationLinkPreviewDto,
  WorkspaceDashboardDto, WorkspaceDateRange, WorkspaceDetailDto, WorkspaceExpenseDto,
  WorkspaceExpenseFilter, WorkspaceInvitationDto, WorkspaceMemberDto, WorkspaceMonthlyReportDto,
  WorkspacePeriod, WorkspaceSettlementDto, WorkspaceSummaryDto, SplitConfigurationDto, UpdateSplitConfigurationRequest,
  RegisterWorkspaceIncomeRequest, WorkspaceIncomeDto, WorkspaceIncomeFilter,
} from "../domain/workspaces.types";

const root = "/v1/workspaces";
function query(params?: WorkspacePeriod | WorkspaceDateRange | WorkspaceExpenseFilter | WorkspaceIncomeFilter): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  return search.size ? `?${search}` : "";
}

export class WorkspacesApiRepository implements IWorkspacesRepository {
  constructor(private readonly http: IHttpClient) {}

  getWorkspaces() { return this.http.get<WorkspaceSummaryDto[]>(root); }
  getWorkspace(id: string) { return this.http.get<WorkspaceDetailDto>(`${root}/${id}`); }
  createWorkspace(req: CreateWorkspaceRequest) { return this.http.post<{ id: string }>(root, req); }
  async updateWorkspace(id: string, req: UpdateWorkspaceRequest): Promise<void> { await this.http.put<void>(`${root}/${id}`, req); }
  async updateSettings(id: string, req: UpdateWorkspaceSettingsRequest): Promise<void> { await this.http.put<void>(`${root}/${id}/settings`, req); }
  getSplitConfiguration(id: string) { return this.http.get<SplitConfigurationDto>(`${root}/${id}/split-configuration`); }
  updateSplitConfiguration(id: string, req: UpdateSplitConfigurationRequest) { return this.http.put<SplitConfigurationDto>(`${root}/${id}/split-configuration`, req); }
  async deactivateWorkspace(id: string): Promise<void> { await this.http.delete<void>(`${root}/${id}`); }
  inviteMember(id: string, req: InviteWorkspaceMemberRequest) { return this.http.post<WorkspaceInvitationDto>(`${root}/${id}/invitations`, req); }
  issueInvitationLink(workspaceId: string) { return this.http.post<IssueWorkspaceInvitationLinkResponse>(`${root}/${workspaceId}/invitation-links`, {}); }
  previewInvitationLink(token: string) {
    const request: PreviewWorkspaceInvitationLinkRequest = { token };
    return this.http.post<WorkspaceInvitationLinkPreviewDto>(`${root}/invitation-links/preview`, request);
  }
  acceptInvitationLink(token: string) {
    const request: AcceptWorkspaceInvitationLinkRequest = { token };
    return this.http.post<AcceptWorkspaceInvitationLinkResponse>(`${root}/invitation-links/accept`, request);
  }
  async revokeInvitationLink(workspaceId: string, linkId: string): Promise<void> { await this.http.delete<void>(`${root}/${workspaceId}/invitation-links/${linkId}`); }
  getPendingInvitations() { return this.http.get<WorkspaceInvitationDto[]>(`${root}/invitations/pending`); }
  acceptInvitation(id: string) { return this.http.post<WorkspaceMemberDto>(`${root}/invitations/${id}/accept`, {}); }
  async rejectInvitation(id: string): Promise<void> { await this.http.post<void>(`${root}/invitations/${id}/reject`, {}); }
  async updateMemberRole(id: string, memberId: string, req: UpdateWorkspaceMemberRoleRequest): Promise<void> { await this.http.put<void>(`${root}/${id}/members/${memberId}`, req); }
  async removeMember(id: string, memberId: string): Promise<void> { await this.http.delete<void>(`${root}/${id}/members/${memberId}`); }
  getDashboard(id: string, period?: WorkspacePeriod) { return this.http.get<WorkspaceDashboardDto>(`${root}/${id}/dashboard${query(period)}`); }
  getExpenses(id: string, filter?: WorkspaceExpenseFilter) { return this.http.get<WorkspaceExpenseDto[]>(`${root}/${id}/expenses${query(filter)}`); }
  registerExpense(id: string, req: RegisterWorkspaceExpenseRequest) { return this.http.post<WorkspaceExpenseDto>(`${root}/${id}/expenses`, req); }
  getIncomes(id: string, filter?: WorkspaceIncomeFilter) { return this.http.get<WorkspaceIncomeDto[]>(`${root}/${id}/incomes${query(filter)}`); }
  registerIncome(id: string, req: RegisterWorkspaceIncomeRequest) { return this.http.post<WorkspaceIncomeDto>(`${root}/${id}/incomes`, req); }
  getBalances(id: string) { return this.http.get<WorkspaceBalancesDto>(`${root}/${id}/balances`); }
  getSettlements(id: string) { return this.http.get<WorkspaceSettlementDto[]>(`${root}/${id}/settlements`); }
  settleBalance(id: string, req: SettleBalanceRequest) { return this.http.post<WorkspaceSettlementDto>(`${root}/${id}/settlements`, req); }
  getBudget(id: string, period?: WorkspacePeriod) { return this.http.get<SharedBudgetDto | null>(`${root}/${id}/budget${query(period)}`); }
  setBudget(id: string, req: SetSharedBudgetRequest) { return this.http.post<SharedBudgetDto>(`${root}/${id}/budget`, req); }
  getGoals(id: string) { return this.http.get<SharedGoalDto[]>(`${root}/${id}/goals`); }
  createGoal(id: string, req: CreateSharedGoalRequest) { return this.http.post<SharedGoalDto>(`${root}/${id}/goals`, req); }
  contributeGoal(id: string, goalId: string, req: ContributeSharedGoalRequest) { return this.http.post<SharedGoalDto>(`${root}/${id}/goals/${goalId}/contribute`, req); }
  getCalendar(id: string, range?: WorkspaceDateRange) { return this.http.get<SharedFinancialEventDto[]>(`${root}/${id}/calendar${query(range)}`); }
  createCalendarEvent(id: string, req: CreateSharedFinancialEventRequest) { return this.http.post<SharedFinancialEventDto>(`${root}/${id}/calendar/events`, req); }
  getReports(id: string, period?: WorkspacePeriod) { return this.http.get<WorkspaceMonthlyReportDto>(`${root}/${id}/reports${query(period)}`); }
}
