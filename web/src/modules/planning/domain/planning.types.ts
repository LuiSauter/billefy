export interface CreateBudgetRequest { limitAmount: number; currency: string; categoryId?: string; alertThreshold?: number; period?: string; }
export interface UpdateBudgetRequest { limitAmount: number; /** Fraction in (0, 1], e.g. 0.8 for 80%. */ alertThreshold: number; }
export interface BudgetDto { id: string; categoryId?: string; period: string; limitAmount: number; currency: string; alertThreshold: number; spentAmount: number; remainingAmount: number; percentageUsed: number; isAlertTriggered: boolean; isExceeded: boolean; isActive: boolean; createdAt: string; }
export type GoalFundingMode = "AccountTracking" | "ReservedFunds";
export type GoalFundingKind = "assign" | "release";
export interface GoalFundingRequest { amount: string; currency: string; occurredAt?: string; }
export interface GoalFundingEntryDto { id: string; goalId: string; accountId: string; kind: GoalFundingKind; amount: number | string; currency: string; occurredAt: string; createdAt: string; }
export interface CreateGoalRequest { name: string; targetAmount: number; currency: string; targetDate?: string; accountId?: string; fundingMode?: GoalFundingMode; }
export interface UpdateGoalRequest { name: string; targetAmount: number; targetDate?: string; accountId?: string; }
export type GoalTrackingStatus = "tracked" | "unlinked" | "unavailable" | "currency_mismatch";
export interface GoalDto {
  id: string; accountId?: string | null; accountName?: string | null; trackingStatus: GoalTrackingStatus; sharedGoalCount: number;
  name: string; targetAmount: number; currency: string; targetDate?: string | null;
  currentAmount: number | null; remainingAmount: number | null; percentageAchieved: number | null;
  monthsRemaining?: number | null; monthlyContributionNeeded?: number | null; createdAt: string;
  fundingMode?: GoalFundingMode; accountReservedAmount?: number | null; accountFundingShortfall?: number | null;
  reservationStatus?: "funded" | "underfunded" | "unavailable" | null;
}
export interface FinancialHealthCurrencyDto {
  currency: string; monthlyIncome: number; monthlyExpenses: number; netCashFlow: number;
  /** Percentage points, e.g. 12.5 means 12.5%. */ savingsRatePercentage: number | null;
  currentBalance: number; outstandingDebtPrincipal: number;
}
export interface FinancialHealthDto { monthStartUtc: string; monthEndUtcExclusive: string; currencies: FinancialHealthCurrencyDto[]; }
export interface ProposeIncomeDistributionRequest { incomeAmount: number; currency?: string; }
export interface IncomeDistributionProposal { totalIncome: number; currency: string; needsAmount: number; wantsAmount: number; debtPaymentAmount: number; savingsAmount: number; needsPercentage: number; wantsPercentage: number; debtPercentage: number; savingsPercentage: number; rationale: string; }

export type RecurringFlowType = "Expense" | "Income";
export type RecurringFrequency = "Weekly" | "BiWeekly" | "Monthly" | "Quarterly" | "SemiAnnual" | "Yearly";
export type RecurringStatus = "Active" | "Paused" | "Completed";
export type RecurringEndType = "Never" | "OnDate" | "AfterOccurrences";

export interface RecurringPaymentDto {
  id: string;
  name: string;
  description?: string | null;
  flowType: RecurringFlowType;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  startDate: string;
  nextDueDate: string;
  status: RecurringStatus;
  endType: RecurringEndType;
  endDate?: string | null;
  totalOccurrences?: number | null;
  completedOccurrences: number;
  autoCreateDraft: boolean;
  categoryId?: string | null;
  defaultAccountId?: string | null;
  daysUntilDue: number;
  isOverdue: boolean;
  isDueSoon: boolean;
  createdAt: string;
}

export interface RecurringCalendarOccurrenceDto {
  recurringId: string;
  name: string;
  flowType: RecurringFlowType;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  date: string;
  isDueSoon: boolean;
  isOverdue: boolean;
  categoryId?: string | null;
  defaultAccountId?: string | null;
}

export interface RecurringSummaryDto {
  activeCount: number;
  monthlyExpenses: number;
  monthlyIncome: number;
  currency: string;
  upcoming7DaysCount: number;
  upcoming7DaysTotal: number;
  overdueCount: number;
  overdueTotal: number;
}

export interface CreateRecurringPaymentRequest {
  name: string;
  description?: string;
  flowType: RecurringFlowType;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  startDate: string;
  nextDueDate?: string;
  endType?: RecurringEndType;
  endDate?: string;
  totalOccurrences?: number;
  categoryId?: string;
  defaultAccountId?: string;
  autoCreateDraft?: boolean;
}

export interface UpdateRecurringPaymentRequest {
  name: string;
  description?: string;
  flowType: RecurringFlowType;
  amount: number;
  frequency: RecurringFrequency;
  nextDueDate: string;
  endType?: RecurringEndType;
  endDate?: string;
  totalOccurrences?: number;
  categoryId?: string;
  defaultAccountId?: string;
  autoCreateDraft?: boolean;
}

export interface RescheduleRecurringPaymentRequest {
  newDueDate: string;
}

export interface ConfirmRecurringPaymentRequest {
  accountId?: string;
  amount?: number;
  occurredAt?: string;
  description?: string;
}

export interface IPlanningRepository {
  createBudget(req: CreateBudgetRequest): Promise<{ id: string }>;
  getBudgets(): Promise<BudgetDto[]>;
  updateBudget(id: string, req: UpdateBudgetRequest): Promise<void>;
  deleteBudget(id: string): Promise<{ message: string }>;
  createGoal(req: CreateGoalRequest): Promise<{ id: string }>;
  updateGoal(id: string, req: UpdateGoalRequest): Promise<{ message: string }>;
  getGoals(): Promise<GoalDto[]>;
  recordGoalFunding(id: string, kind: GoalFundingKind, request: GoalFundingRequest, key: string): Promise<GoalFundingEntryDto>;
  getGoalFunding(id: string): Promise<GoalFundingEntryDto[]>;
  deleteGoal(id: string): Promise<{ message: string }>;
  getFinancialHealth(): Promise<FinancialHealthDto>;
  proposeIncomeDistribution(req: ProposeIncomeDistributionRequest): Promise<IncomeDistributionProposal>;
  getRecurringPayments(params?: { flowType?: string; status?: string; search?: string }): Promise<RecurringPaymentDto[]>;
  getRecurringSummary(currency?: string): Promise<RecurringSummaryDto>;
  getRecurringCalendarOccurrences(start?: string, end?: string): Promise<RecurringCalendarOccurrenceDto[]>;
  getRecurringPaymentById(id: string): Promise<RecurringPaymentDto>;
  createRecurringPayment(req: CreateRecurringPaymentRequest): Promise<{ id: string }>;
  updateRecurringPayment(id: string, req: UpdateRecurringPaymentRequest): Promise<{ message: string }>;
  deleteRecurringPayment(id: string): Promise<{ message: string }>;
  rescheduleRecurringPayment(id: string, req: RescheduleRecurringPaymentRequest): Promise<{ message: string }>;
  pauseRecurringPayment(id: string): Promise<{ message: string }>;
  resumeRecurringPayment(id: string): Promise<{ message: string }>;
  confirmRecurringPayment(id: string, req: ConfirmRecurringPaymentRequest): Promise<{ transactionId: string }>;
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
