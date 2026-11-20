import Decimal from "decimal.js";
import type { SettleBalanceRequest, WorkspaceBalancesDto, WorkspaceExpenseDto, WorkspaceMemberDto } from "../domain/workspaces.types";
import { validWorkspaceAmount, validWorkspaceDate } from "./workspace-expense";

export function balanceSummary(expenses: WorkspaceExpenseDto[], members: WorkspaceMemberDto[], currency: string) {
  const relevant = expenses.filter((expense) => expense.currency === currency);
  const sum = (values: number[]) => values.reduce((total, value) => total.plus(value), new Decimal(0)).toString();
  return {
    total: sum(relevant.map((expense) => expense.amount)),
    members: members.map((member) => ({ memberId: member.id, paid: sum(relevant.filter((expense) => expense.paidByMemberId === member.id).map((expense) => expense.amount)), allocated: sum(relevant.flatMap((expense) => expense.allocations.filter((allocation) => allocation.memberId === member.id).map((allocation) => allocation.amount))) })),
  };
}
export interface SettlementDraft { payerMemberId: string; receiverMemberId: string; amount: string; settlementDate: string; notes: string; }
export function buildSettlementRequest(draft: SettlementDraft, balances: WorkspaceBalancesDto, currency: string): SettleBalanceRequest {
  const debt = balances.pairwiseBalances.find((balance) => balance.debtorMemberId === draft.payerMemberId && balance.creditorMemberId === draft.receiverMemberId && balance.currency === currency);
  if (!debt || draft.payerMemberId === draft.receiverMemberId) throw new Error("Selecciona un pagador y receptor con saldo pendiente.");
  if (!validWorkspaceAmount(draft.amount) || new Decimal(draft.amount).gt(debt.amount)) throw new Error("El monto debe ser positivo y no superar el saldo pendiente, con hasta dos decimales.");
  if (!validWorkspaceDate(draft.settlementDate)) throw new Error("Selecciona una fecha válida.");
  if (draft.notes.length > 300) throw new Error("Las notas no pueden superar 300 caracteres.");
  return { ...draft, amount: new Decimal(draft.amount).toNumber(), notes: draft.notes.trim() || null, currency };
}
