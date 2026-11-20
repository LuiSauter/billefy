import Decimal from "decimal.js";
import type { FinancialEventType, SharedFinancialEventDto, WorkspaceDetailDto } from "../domain/workspaces.types";
import { validWorkspaceNonNegativeAmount, validWorkspaceDate } from "./workspace-expense";
import { workspacePeriodKey } from "./workspace-view-ui";

export const sharedEventTypes: { value: FinancialEventType; label: string; tone: string }[] = [
  { value: "Payment", label: "Pago", tone: "border-rose-500/40 bg-rose-500/15 text-rose-500" },
  { value: "Collection", label: "Cobro", tone: "border-emerald-500/40 bg-emerald-500/15 text-emerald-500" },
  { value: "GoalContribution", label: "Aporte a meta", tone: "border-chart-4/40 bg-chart-4/20 text-chart-4" },
  { value: "BudgetClose", label: "Cierre de presupuesto", tone: "border-amber-500/40 bg-amber-500/15 text-amber-500" },
];
export function shiftWorkspaceMonth(year: number, month: number, delta: number) {
  const date = new Date(`${workspacePeriodKey(year, month)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return workspacePeriodKey(date.getUTCFullYear(), date.getUTCMonth() + 1);
}
export function calendarMonthDays(year: number, month: number) {
  const start = new Date(`${workspacePeriodKey(year, month)}-01T00:00:00Z`);
  const offset = (start.getUTCDay() + 6) % 7;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  const length = Math.ceil((offset + end.getUTCDate()) / 7) * 7;
  start.setUTCDate(1 - offset);
  return Array.from({ length }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return { date: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() + 1 === month && date.getUTCFullYear() === year };
  });
}
export function filterCalendarEvents(events: SharedFinancialEventDto[], year: number, month: number, type = "all", responsible = "all") {
  return events.filter((event) => event.dueDate.startsWith(`${workspacePeriodKey(year, month)}-`) && (type === "all" || event.financialEventType === type) && (responsible === "all" || event.responsibleMemberId === responsible)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
export interface SharedEventDraft { title: string; financialEventType: FinancialEventType; dueDate: string; amount: string; responsibleMemberId: string; notes: string; }
export function buildSharedEventRequest(draft: SharedEventDraft, workspace: WorkspaceDetailDto) {
  if (!draft.title.trim() || draft.title.trim().length > 150) throw new Error("Escribe un título de hasta 150 caracteres.");
  if (!validWorkspaceDate(draft.dueDate)) throw new Error("Selecciona una fecha válida.");
  if (!validWorkspaceNonNegativeAmount(draft.amount)) throw new Error("Escribe un monto no negativo con hasta dos decimales.");
  if (!sharedEventTypes.some((type) => type.value === draft.financialEventType)) throw new Error("Selecciona un tipo de evento válido.");
  if (!workspace.members.some((member) => member.id === draft.responsibleMemberId && member.isActive)) throw new Error("Selecciona un responsable activo del espacio.");
  if (draft.notes.length > 300) throw new Error("Las notas no pueden superar 300 caracteres.");
  return { ...draft, title: draft.title.trim(), amount: new Decimal(draft.amount).toNumber(), currency: workspace.baseCurrency, notes: draft.notes.trim() || null };
}
