export interface CreateBudgetRequest {
  limitAmount: number;
  currency: string;
  categoryId?: string;
  alertThreshold?: number;
  period?: string;
}

export interface BudgetDto {
  id: string;
  categoryId?: string;
  period: string;
  limitAmount: number;
  currency: string;
  alertThreshold: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  isAlertTriggered: boolean;
  isExceeded: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateGoalRequest {
  name: string;
  targetAmount: number;
  currency: string;
  targetDate?: string;
  accountId?: string;
}

export interface GoalDto {
  id: string;
  accountId?: string;
  name: string;
  targetAmount: number;
  currency: string;
  targetDate?: string;
  currentAmount: number;
  remainingAmount: number;
  percentageAchieved: number;
  monthsRemaining?: number;
  monthlyContributionNeeded?: number;
  createdAt: string;
}

export interface BudgetSplit503020Dto {
  monthlyIncome: number;
  needsTarget: number;
  wantsTarget: number;
  savingsTarget: number;
}

export interface FinancialHealthDto {
  monthlyIncome: number;
  monthlyExpenses: number;
  netSavings: number;
  savingsRate: number;
  totalLiquidBalance: number;
  emergencyFundMonths: number;
  totalDebtLiabilities: number;
  split503020: BudgetSplit503020Dto;
}

export interface ProposeIncomeDistributionRequest {
  incomeAmount: number;
  currency?: string;
}

export interface IncomeDistributionProposal {
  totalIncome: number;
  currency: string;
  needsAmount: number;
  wantsAmount: number;
  debtPaymentAmount: number;
  savingsAmount: number;
  needsPercentage: number;
  wantsPercentage: number;
  debtPercentage: number;
  savingsPercentage: number;
  rationale: string;
}

export interface IPlanningRepository {
  createBudget(req: CreateBudgetRequest): Promise<{ id: string }>;
  getBudgets(): Promise<BudgetDto[]>;
  deleteBudget(id: string): Promise<{ message: string }>;
  createGoal(req: CreateGoalRequest): Promise<{ id: string }>;
  getGoals(): Promise<GoalDto[]>;
  deleteGoal(id: string): Promise<{ message: string }>;
  getFinancialHealth(): Promise<FinancialHealthDto>;
  proposeIncomeDistribution(
    req: ProposeIncomeDistributionRequest
  ): Promise<IncomeDistributionProposal>;
}

export function getBudgetCategoryEmoji(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("alimento") || c.includes("comida") || c.includes("super")) return "🍔";
  if (c.includes("transporte") || c.includes("gasolina") || c.includes("auto")) return "🚗";
  if (c.includes("vivienda") || c.includes("alquiler") || c.includes("casa")) return "🏠";
  if (c.includes("ocio") || c.includes("salida") || c.includes("diversion")) return "🎉";
  if (c.includes("salud") || c.includes("farmacia")) return "💊";
  return "💡";
}

export function getGoalEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("fondo") || n.includes("emergencia") || n.includes("colchon")) return "🛡️";
  if (n.includes("vehiculo") || n.includes("auto") || n.includes("car")) return "🚗";
  if (n.includes("departamento") || n.includes("casa") || n.includes("hogar")) return "🏡";
  if (n.includes("viaje") || n.includes("vacaciones") || n.includes("playa")) return "🏖️";
  return "🎯";
}
