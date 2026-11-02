export interface CreateBudgetRequest { limitAmount: number; currency: string; categoryId?: string; alertThreshold?: number; period?: string; }
export interface UpdateBudgetRequest { limitAmount: number; /** Fraction in (0, 1], e.g. 0.8 for 80%. */ alertThreshold: number; }
export interface BudgetDto { id: string; categoryId?: string; period: string; limitAmount: number; currency: string; alertThreshold: number; spentAmount: number; remainingAmount: number; percentageUsed: number; isAlertTriggered: boolean; isExceeded: boolean; isActive: boolean; createdAt: string; }
export interface CreateGoalRequest { name: string; targetAmount: number; currency: string; targetDate?: string; accountId?: string; }
export interface UpdateGoalRequest { name: string; targetAmount: number; targetDate?: string; accountId?: string; }
export type GoalTrackingStatus = "tracked" | "unlinked" | "unavailable" | "currency_mismatch";
export interface GoalDto {
  id: string; accountId?: string | null; accountName?: string | null; trackingStatus: GoalTrackingStatus; sharedGoalCount: number;
  name: string; targetAmount: number; currency: string; targetDate?: string | null;
  currentAmount: number | null; remainingAmount: number | null; percentageAchieved: number | null;
  monthsRemaining?: number | null; monthlyContributionNeeded?: number | null; createdAt: string;
}
export interface FinancialHealthCurrencyDto {
  currency: string; monthlyIncome: number; monthlyExpenses: number; netCashFlow: number;
  /** Percentage points, e.g. 12.5 means 12.5%. */ savingsRatePercentage: number | null;
  currentBalance: number; outstandingDebtPrincipal: number;
}
export interface FinancialHealthDto { monthStartUtc: string; monthEndUtcExclusive: string; currencies: FinancialHealthCurrencyDto[]; }
export interface ProposeIncomeDistributionRequest { incomeAmount: number; currency?: string; }
export interface IncomeDistributionProposal { totalIncome: number; currency: string; needsAmount: number; wantsAmount: number; debtPaymentAmount: number; savingsAmount: number; needsPercentage: number; wantsPercentage: number; debtPercentage: number; savingsPercentage: number; rationale: string; }
export interface IPlanningRepository {
  createBudget(req: CreateBudgetRequest): Promise<{ id: string }>;
  getBudgets(): Promise<BudgetDto[]>;
  updateBudget(id: string, req: UpdateBudgetRequest): Promise<void>;
  deleteBudget(id: string): Promise<{ message: string }>;
  createGoal(req: CreateGoalRequest): Promise<{ id: string }>;
  updateGoal(id: string, req: UpdateGoalRequest): Promise<{ message: string }>;
  getGoals(): Promise<GoalDto[]>;
  deleteGoal(id: string): Promise<{ message: string }>;
  getFinancialHealth(): Promise<FinancialHealthDto>;
  proposeIncomeDistribution(req: ProposeIncomeDistributionRequest): Promise<IncomeDistributionProposal>;
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
