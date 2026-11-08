import React from "react";
import { FormField } from "@/shared/ui/form-field";
import type { SharedBudgetDto, SharedFinancialEventDto, SharedGoalDto, WorkspaceDashboardDto, WorkspaceDetailDto, WorkspaceExpenseDto } from "../domain/workspaces.types";

// Synthetic fixtures only; never consumed by production views or sent to an API.
export const workspaceFixture: WorkspaceDetailDto = {
  id: "home", name: "Casa de prueba", workspaceType: "Couple", baseCurrency: "BOB", icon: "heart", color: "violet", description: null, isActive: true, createdBy: "viewer", createdAt: "2026-01-01", startDate: "2026-01-01",
  settings: { hidePersonalPatrimony: true, memberSeesOnlyShared: true, showIndividualContributions: true, allowMovementComments: true, paymentReminders: true, weeklySummary: true, spaceNotifications: true },
  members: [
    { id: "one", userId: "viewer", workspaceRole: "Owner", incomeSharePercentage: 60, joinedAt: "2026-01-01", isActive: true },
    { id: "two", userId: "other", workspaceRole: "Member", incomeSharePercentage: 40, joinedAt: "2026-01-01", isActive: true },
  ],
};
export const budgetFixture: SharedBudgetDto = { year: 2026, month: 10, amount: 1000, currency: "BOB", spentAmount: 725, remainingAmount: 275, executionPercentage: 72.5, categories: [{ categoryId: "food", limitAmount: 750, spentAmount: 725, remainingAmount: 25 }] };
export const dashboardFixture: WorkspaceDashboardDto = {
  workspaceId: "home", year: 2026, month: 10, currency: "BOB", balance: 875, monthlyIncome: 1200, monthlyExpenses: 725, savings: 475, budgetExecutionPercentage: 72.5,
  categoryBreakdown: [{ categoryId: "food", amount: 725, percentage: 100 }],
  memberContributions: [{ memberId: "one", paidAmount: 725, allocatedAmount: 435, goalContributions: 60, netBalance: 290 }],
  pendingSettlements: [{ debtorMemberId: "two", creditorMemberId: "one", amount: 290, currency: "BOB" }],
  balances: { pairwiseBalances: [{ debtorMemberId: "two", creditorMemberId: "one", amount: 290, currency: "BOB" }], memberNetBalances: [{ memberId: "one", balance: 290, currency: "BOB" }], settlements: [] }, budget: budgetFixture,
};
export const goalsFixture: SharedGoalDto[] = [{ id: "goal", title: "Viaje de prueba", targetAmount: 100, currency: "BOB", currentAmount: 60, monthlyCommitmentAmount: 0, targetDate: null, category: null, status: "Active", memberContributions: [{ memberId: "one", amount: 60, contributedAt: "2026-10-20" }, { memberId: "two", amount: 90, contributedAt: "2026-09-20" }] }];
export const calendarFixture: SharedFinancialEventDto[] = [{ id: "payment", title: "Internet de prueba", financialEventType: "Payment", dueDate: "2026-10-25", amount: 250, currency: "BOB", responsibleMemberId: "two", isCompleted: false, notes: null, isDerived: false }];
export const expensesFixture: WorkspaceExpenseDto[] = [{ id: "expense", workspaceId: "home", description: "Compra de prueba", amount: 725, currency: "BOB", date: "2026-10-28", paidByMemberId: "one", categoryId: "food", notes: null, splitRuleType: "IncomeProportional", allocations: [{ memberId: "one", amount: 435, percentage: 60 }, { memberId: "two", amount: 290, percentage: 40 }] }];
export type TestElement = React.ReactElement<Record<string, unknown>>;
export function viewNodes(tree: React.ReactNode): TestElement[] {
  if (Array.isArray(tree)) return tree.flatMap(viewNodes);
  if (!React.isValidElement(tree)) return [];
  const node = tree as TestElement;
  const children = node.type === FormField && typeof node.props.children === "function"
    ? (node.props.children as (controls: object) => React.ReactNode)({})
    : node.props.children as React.ReactNode;
  return [node, ...viewNodes(children), ...viewNodes(node.props.footer as React.ReactNode)];
}
