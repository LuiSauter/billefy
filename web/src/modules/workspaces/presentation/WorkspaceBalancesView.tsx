"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import { ArrowLeftRight, ArrowRight, BellRing, Check, ChevronRight, History, Scale, Wallet } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { Textarea } from "@/shared/ui/textarea";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import type { PairwiseBalanceDto, WorkspaceBalancesDto, WorkspaceExpenseDto, WorkspaceMemberDto } from "../domain/workspaces.types";
import { balanceSummary } from "./workspace-balances";
import { WorkspaceMember, workspaceMemberLabel } from "./workspace-members";
import { workspaceMoney, workspacePanel } from "./workspace-ui";

interface Props {
  members: WorkspaceMemberDto[];
  expenses: WorkspaceExpenseDto[];
  balances: WorkspaceBalancesDto;
  currency: string;
  viewerUserId?: string;
  initialPeriod?: string;
  onSettleBalance: (balance: PairwiseBalanceDto) => void;
}
export function WorkspaceBalancesView({ members, expenses, balances, currency, viewerUserId, initialPeriod = "", onSettleBalance }: Props) {
  const [group, setGroup] = useState<"person" | "category">("person");
  const [period, setPeriod] = useState(initialPeriod);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const { findCategory } = useUserCategories();
  const viewer = members.find((member) => member.userId === viewerUserId);
  const label = (id: string) => workspaceMemberLabel(members, id, viewerUserId);
  const money = (amount: Decimal.Value) => workspaceMoney(amount, currency);
  const relevant = expenses.filter((expense) => expense.currency === currency && (!period || expense.date.startsWith(period)));
  const summary = balanceSummary(relevant, members, currency);
  const lifetime = balanceSummary(expenses, members, currency);
  const pairs = balances.pairwiseBalances.filter((balance) => balance.currency === currency && new Decimal(balance.amount).gt(0));
  const viewerNet = balances.memberNetBalances.find((balance) => balance.memberId === viewer?.id && balance.currency === currency)?.balance;
  const net = viewerNet === undefined ? null : new Decimal(viewerNet);
  const canSettle = pairs.filter((balance) => !viewer || viewer.workspaceRole !== "Member" || balance.debtorMemberId === viewer.id);
  const debt = canSettle.find((balance) => balance.debtorMemberId === viewer?.id || balance.creditorMemberId === viewer?.id) ?? canSettle[0];
  const reminderDebt = pairs.find((balance) => balance.creditorMemberId === viewer?.id);
  const settlements = balances.settlements.filter((settlement) => settlement.currency === currency && (!period || settlement.settlementDate.startsWith(period))).sort((a, b) => b.settlementDate.localeCompare(a.settlementDate));
  const categories = [...new Set(relevant.map((expense) => expense.categoryId))].map((categoryId) => ({ categoryId, expenses: relevant.filter((expense) => expense.categoryId === categoryId) }));
  const reminder = reminderDebt ? `Saldo compartido pendiente: ${label(reminderDebt.debtorMemberId)} → ${label(reminderDebt.creditorMemberId)}, ${money(reminderDebt.amount)}. Revisa el espacio para registrar la liquidación cuando se realice el pago.` : "";
  const outstanding = pairs.reduce((total, balance) => total.plus(balance.amount), new Decimal(0));
  const heroMembers = [...lifetime.members].sort((a, b) => a.memberId === viewer?.id ? -1 : b.memberId === viewer?.id ? 1 : 0);
  const memberCard = (member: typeof heroMembers[number]) => <div key={member.memberId} className="min-w-0 space-y-2 rounded-xl bg-muted/20 p-3"><WorkspaceMember members={members} id={member.memberId} viewerUserId={viewerUserId} /><p className="text-xs text-muted-foreground">Gastó: <strong className="text-foreground">{money(member.paid)}</strong></p><p className="text-xs text-muted-foreground">Su parte: <strong className="text-foreground">{money(member.allocated)}</strong></p></div>;
  const badge = <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-center"><span className="flex items-center gap-2 text-sm"><ArrowRight className="size-5 text-primary" />{net?.gt(0) ? "Te deben" : net?.lt(0) ? "Debes" : pairs.length ? "Saldo pendiente" : "Todo al día"}</span><strong className="text-2xl font-extrabold text-primary tabular-nums">{money(net && !net.isZero() ? net.abs() : outstanding)}</strong></div>;
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
    <div className="min-w-0 space-y-4">
      <section className={`${workspacePanel} space-y-4`}><header className="flex items-start gap-3"><span className="rounded-xl bg-primary/20 p-3 text-primary"><Scale /></span><div><h2 className="text-xl font-bold">Balance entre integrantes</h2><p className="text-sm text-muted-foreground">Quién debe a quién y cuánto</p><p className="mt-1 text-xs text-muted-foreground">Saldo acumulado · incluye todas las liquidaciones completadas</p></div></header>
        {heroMembers.length === 2 ? <div className="grid items-center gap-3 sm:grid-cols-[1fr_1.2fr_1fr]">{memberCard(heroMembers[0])}{badge}{memberCard(heroMembers[1])}</div> : <>{badge}<div className="grid gap-3 sm:grid-cols-2">{heroMembers.map(memberCard)}</div></>}
        {!!pairs.length && <ul className="space-y-2 border-t border-border pt-3">{pairs.map((balance) => <li key={`${balance.debtorMemberId}-${balance.creditorMemberId}`} className="flex flex-wrap items-center gap-2 text-xs"><span>{label(balance.debtorMemberId)} debe a {label(balance.creditorMemberId)}</span><strong className="text-primary">{money(balance.amount)}</strong></li>)}</ul>}
      </section>
      <section className={`${workspacePanel} space-y-4`}><header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Detalle de balances</h2><SegmentedControl aria-label="Agrupar balances" value={group} onChange={setGroup} options={[{ value: "person", label: "Por persona" }, { value: "category", label: "Por categoría" }]} /></header><p className="text-xs text-muted-foreground">Participación de cada gasto antes de liquidaciones. Los pagos registrados se reflejan en el saldo acumulado.</p>
        {relevant.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No hay gastos compartidos en este período.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Detalle de balances {group === "person" ? "por persona" : "por categoría"}</caption><thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="p-2">{group === "person" ? "Gasto / Fecha" : "Categoría"}</th><th className="p-2">Pagó</th><th className="p-2">Participación</th></tr></thead><tbody>{group === "person" ? [...relevant].sort((a, b) => b.date.localeCompare(a.date)).map((expense) => <tr key={expense.id} className="border-b border-border last:border-0"><td className="p-2"><strong className="block">{expense.description}</strong><span className="text-xs text-muted-foreground">{expense.date.slice(0, 10)}</span></td><td className="p-2"><Badge variant="secondary">{label(expense.paidByMemberId)}: {money(expense.amount)}</Badge></td><td className="space-y-1 p-2">{expense.allocations.filter((allocation) => allocation.memberId !== expense.paidByMemberId).map((allocation) => <p key={allocation.memberId} className="whitespace-nowrap text-xs">{label(allocation.memberId)} debe: <strong className="text-primary">{money(allocation.amount)}</strong></p>)}</td></tr>) : categories.map((category) => {
          const totals = balanceSummary(category.expenses, members, currency);
          return <tr key={category.categoryId ?? "none"} className="border-b border-border last:border-0"><th className="p-2 font-semibold">{category.categoryId ? findCategory(category.categoryId)?.name ?? "Categoría compartida" : "Sin categoría"}<span className="mt-1 block text-xs text-muted-foreground">{money(totals.total)}</span></th><td className="space-y-1 p-2">{totals.members.filter((member) => new Decimal(member.paid).gt(0)).map((member) => <p key={member.memberId} className="text-xs">{label(member.memberId)}: {money(member.paid)}</p>)}</td><td className="space-y-1 p-2">{totals.members.map((member) => <p key={member.memberId} className="text-xs">{label(member.memberId)}: <strong className="text-primary">{money(member.allocated)}</strong></p>)}</td></tr>;
        })}</tbody></table></div>}
      </section>
      <section className={`${workspacePanel} space-y-3`}><h2 className="flex items-center gap-2 text-lg font-bold"><History className="size-5 text-primary" />Historial de liquidaciones</h2>{settlements.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Aún no hay liquidaciones en este período.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Liquidaciones registradas</caption><thead><tr className="border-b border-border text-muted-foreground">{["Fecha", "Descripción", "Monto", "De", "Para", "Estado"].map((title) => <th key={title} className="p-2">{title}</th>)}</tr></thead><tbody>{settlements.map((settlement) => <tr key={settlement.id} className="border-b border-border last:border-0"><td className="whitespace-nowrap p-2">{settlement.settlementDate.slice(0, 10)}</td><td className="min-w-32 p-2">{settlement.notes || "Liquidación entre integrantes"}</td><td className="whitespace-nowrap p-2 font-bold">{money(settlement.amount)}</td><td className="p-2"><WorkspaceMember members={members} id={settlement.payerMemberId} viewerUserId={viewerUserId} /></td><td className="p-2"><WorkspaceMember members={members} id={settlement.receiverMemberId} viewerUserId={viewerUserId} /></td><td className="p-2"><Badge variant="outline" className={settlement.status === "Completed" ? "border-emerald-500/30 text-emerald-500" : "text-amber-500"}>{settlement.status === "Completed" && <Check className="size-3" />}{settlement.status === "Completed" ? "Completado" : "Pendiente"}</Badge></td></tr>)}</tbody></table></div>}</section>
    </div>
    <aside className="min-w-0 space-y-4"><section className={`${workspacePanel} space-y-3`}><h2 className="text-lg font-bold">Resumen del período</h2><FormField label="Período" hint={period ? "Gastos e historial del mes seleccionado. El saldo pendiente es acumulado." : "Mostrando todo el historial."}>{(control) => <Input {...control} type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />}</FormField><dl className="divide-y divide-border text-sm"><div className="flex justify-between gap-2 py-3"><dt className="flex items-center gap-2 text-muted-foreground"><Wallet className="size-4" />Total de gastos</dt><dd className="font-bold">{money(summary.total)}</dd></div><div className="py-3"><dt className="mb-2 text-muted-foreground">Parte de cada uno</dt>{summary.members.map((member) => <dd key={member.memberId} className="flex justify-between gap-2 py-1 text-xs"><span>{label(member.memberId)}</span><strong>{money(member.allocated)}</strong></dd>)}</div><div className="flex justify-between gap-2 py-3"><dt className="text-muted-foreground">Diferencia (saldo pendiente)</dt><dd className="font-bold text-primary">{money(outstanding)}</dd></div></dl></section>
      <section className={`${workspacePanel} space-y-3`}><h2 className="text-lg font-bold">Acciones rápidas</h2>{[
        { title: "Registrar liquidación", description: "Marcar un pago entre integrantes", Icon: ArrowLeftRight, disabled: !debt, action: () => debt && onSettleBalance(debt) },
        { title: "Liquidar todo el saldo", description: debt ? `Registrar el pago total de ${money(debt.amount)}` : "No hay saldo disponible para liquidar", Icon: Scale, disabled: !debt, action: () => debt && onSettleBalance(debt) },
        { title: "Recordar pago", description: "Preparar un recordatorio para copiar", Icon: BellRing, disabled: !reminderDebt, action: () => { setReminderOpen((value) => !value); setCopyStatus(""); } },
      ].map(({ title, description, Icon, disabled, action }) => <Button key={title} variant="outline" disabled={disabled} className="h-auto w-full justify-start whitespace-normal p-3 text-left" onClick={action}><span className="rounded-xl bg-primary/15 p-2 text-primary"><Icon className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="text-xs font-normal text-muted-foreground">{description}</span></span><ChevronRight className="size-4 shrink-0" /></Button>)}
        {reminderOpen && reminderDebt && <div className="space-y-2 border-t border-border pt-3"><FormField label="Recordatorio de pago" hint="No se envía automáticamente ni se contacta a otros integrantes.">{(control) => <Textarea {...control} value={reminder} readOnly rows={4} />}</FormField><Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(reminder); setCopyStatus("Recordatorio copiado."); } catch { setCopyStatus("No se pudo copiar. Selecciona el texto y cópialo manualmente."); } }}>Copiar recordatorio</Button>{copyStatus && <p role="status" className="text-xs text-muted-foreground">{copyStatus}</p>}</div>}
      </section>
    </aside>
  </div>;
}
