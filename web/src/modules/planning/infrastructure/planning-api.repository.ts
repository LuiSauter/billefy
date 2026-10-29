import { IHttpClient } from "@/shared/application/http-client.contract";
import {
  BudgetDto,
  CreateBudgetRequest,
  CreateGoalRequest,
  FinancialHealthDto,
  GoalDto,
  IPlanningRepository,
  IncomeDistributionProposal,
  ProposeIncomeDistributionRequest,
} from "../domain/planning.types";

export class PlanningApiRepository implements IPlanningRepository {
  constructor(private readonly http: IHttpClient) {}

  async createBudget(req: CreateBudgetRequest): Promise<{ id: string }> {
    return this.http.post<{ id: string }>("/v1/planning/budgets", req);
  }

  async getBudgets(): Promise<BudgetDto[]> {
    return this.http.get<BudgetDto[]>("/v1/planning/budgets");
  }

  async deleteBudget(id: string): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/v1/planning/budgets/${id}`);
  }

  async createGoal(req: CreateGoalRequest): Promise<{ id: string }> {
    return this.http.post<{ id: string }>("/v1/planning/goals", req);
  }

  async getGoals(): Promise<GoalDto[]> {
    return this.http.get<GoalDto[]>("/v1/planning/goals");
  }

  async deleteGoal(id: string): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/v1/planning/goals/${id}`);
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
}
