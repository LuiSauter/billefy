import { IHttpClient } from "@/shared/application/http-client.contract";
import {
  BudgetDto,
  CreateBudgetRequest,
  CreateGoalRequest,
  CreateRecurringPaymentRequest,
  ConfirmRecurringPaymentRequest,
  UpdateRecurringPaymentRequest,
  RescheduleRecurringPaymentRequest,
  UpdateGoalRequest,
  FinancialHealthDto,
  GoalDto,
  GoalFundingKind,
  GoalFundingRequest,
  GoalFundingEntryDto,
  IPlanningRepository,
  IncomeDistributionProposal,
  ProposeIncomeDistributionRequest,
  RecurringCalendarOccurrenceDto,
  RecurringPaymentDto,
  RecurringSummaryDto,
  UpdateBudgetRequest,
} from "../domain/planning.types";

export class PlanningApiRepository implements IPlanningRepository {
  constructor(private readonly http: IHttpClient) {}

  async createBudget(req: CreateBudgetRequest): Promise<{ id: string }> {
    return this.http.post<{ id: string }>("/v1/planning/budgets", req);
  }

  async getBudgets(): Promise<BudgetDto[]> {
    return this.http.get<BudgetDto[]>("/v1/planning/budgets");
  }

  async updateBudget(id: string, req: UpdateBudgetRequest): Promise<void> {
    const { limitAmount, alertThreshold } = req;
    await this.http.put<void>(`/v1/planning/budgets/${id}`, { limitAmount, alertThreshold });
  }

  async deleteBudget(id: string): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/v1/planning/budgets/${id}`);
  }

  async createGoal(req: CreateGoalRequest): Promise<{ id: string }> {
    return this.http.post<{ id: string }>("/v1/planning/goals", req);
  }

  async updateGoal(id: string, req: UpdateGoalRequest): Promise<{ message: string }> {
    return this.http.put<{ message: string }>(`/v1/planning/goals/${id}`, req);
  }

  async getGoals(): Promise<GoalDto[]> {
    return this.http.get<GoalDto[]>("/v1/planning/goals");
  }

  async deleteGoal(id: string): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/v1/planning/goals/${id}`);
  }

  async recordGoalFunding(id: string, kind: GoalFundingKind, request: GoalFundingRequest, key: string): Promise<GoalFundingEntryDto> {
    return this.http.post<GoalFundingEntryDto>(`/v1/planning/goals/${id}/funding/${kind}`, request, { headers: { "Idempotency-Key": key } });
  }

  async getGoalFunding(id: string): Promise<GoalFundingEntryDto[]> {
    return this.http.get<GoalFundingEntryDto[]>(`/v1/planning/goals/${id}/funding`);
  }

  async getFinancialHealth(): Promise<FinancialHealthDto> {
    return this.http.get<FinancialHealthDto>("/v1/planning/financial-health");
  }

  async proposeIncomeDistribution(
    req: ProposeIncomeDistributionRequest
  ): Promise<IncomeDistributionProposal> {
    return this.http.post<IncomeDistributionProposal>(
      "/v1/planning/income-distribution/propose",
      req
    );
  }

  async getRecurringPayments(params?: {
    flowType?: string;
    status?: string;
    search?: string;
  }): Promise<RecurringPaymentDto[]> {
    const query = new URLSearchParams();
    if (params?.flowType) query.set("flowType", params.flowType);
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return this.http.get<RecurringPaymentDto[]>(`/v1/planning/recurring${qs ? `?${qs}` : ""}`);
  }

  async getRecurringSummary(currency?: string): Promise<RecurringSummaryDto> {
    const qs = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    return this.http.get<RecurringSummaryDto>(`/v1/planning/recurring/summary${qs}`);
  }

  async getRecurringCalendarOccurrences(start?: string, end?: string): Promise<RecurringCalendarOccurrenceDto[]> {
    try {
      const query = new URLSearchParams();
      if (start) query.set("start", start);
      if (end) query.set("end", end);
      const qs = query.toString();
      return await this.http.get<RecurringCalendarOccurrenceDto[]>(`/v1/planning/recurring/calendar${qs ? `?${qs}` : ""}`);
    } catch {
      return [];
    }
  }

  async getRecurringPaymentById(id: string): Promise<RecurringPaymentDto> {
    return this.http.get<RecurringPaymentDto>(`/v1/planning/recurring/${id}`);
  }

  async createRecurringPayment(
    req: CreateRecurringPaymentRequest
  ): Promise<{ id: string }> {
    return this.http.post<{ id: string }>("/v1/planning/recurring", req);
  }

  async updateRecurringPayment(
    id: string,
    req: UpdateRecurringPaymentRequest
  ): Promise<{ message: string }> {
    return this.http.put<{ message: string }>(`/v1/planning/recurring/${id}`, req);
  }

  async deleteRecurringPayment(id: string): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/v1/planning/recurring/${id}`);
  }

  async rescheduleRecurringPayment(
    id: string,
    req: RescheduleRecurringPaymentRequest
  ): Promise<{ message: string }> {
    return this.http.post<{ message: string }>(`/v1/planning/recurring/${id}/reschedule`, req);
  }

  async pauseRecurringPayment(id: string): Promise<{ message: string }> {
    return this.http.post<{ message: string }>(`/v1/planning/recurring/${id}/pause`, {});
  }

  async resumeRecurringPayment(id: string): Promise<{ message: string }> {
    return this.http.post<{ message: string }>(`/v1/planning/recurring/${id}/resume`, {});
  }

  async confirmRecurringPayment(
    id: string,
    req: ConfirmRecurringPaymentRequest
  ): Promise<{ transactionId: string }> {
    return this.http.post<{ transactionId: string }>(`/v1/planning/recurring/${id}/confirm`, req);
  }
}
