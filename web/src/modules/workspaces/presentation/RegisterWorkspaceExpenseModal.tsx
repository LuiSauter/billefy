"use client";

import React, { useRef, useState } from "react";
import Decimal from "decimal.js";
import { Check, Info, ReceiptText, ShoppingCart, Users } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { SelectField } from "@/shared/ui/select-field";
import { Textarea } from "@/shared/ui/textarea";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { CategoryPickerField } from "@/modules/ledger/presentation/CategoryPickerField";
import { CategoryCreatorView } from "@/modules/ledger/presentation/CategoryCreatorView";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import type { RegisterWorkspaceExpenseRequest, WorkspaceMemberDto } from "../domain/workspaces.types";
import { buildExpenseRequest, expensePreview, expenseRules, initialExpenseDraft, type ExpenseDraft } from "./workspace-expense";
import { WorkspaceMember, workspaceMemberLabel } from "./workspace-members";
import { workspaceMoney, workspacePanel } from "./workspace-ui";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: WorkspaceMemberDto[];
  currency: string;
  viewerUserId?: string;
  registerExpense: (request: RegisterWorkspaceExpenseRequest) => Promise<unknown>;
}
export function RegisterWorkspaceExpenseModal({ open, onOpenChange, members, currency, viewerUserId, registerExpense }: Props) {
  const [draft, setDraft] = useState(() => initialExpenseDraft(members, viewerUserId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [categoryPanel, setCategoryPanel] = useState<"closed" | "picker" | "create">("closed");
  const [categoryValid, setCategoryValid] = useState(false);
  const inFlight = useRef(false);
  const { getCategoriesByDirection, findCategory } = useUserCategories();
  const active = members.filter((member) => member.isActive);
  const allocations = expensePreview(draft, members);
  const rule = expenseRules.find((item) => item.value === draft.rule)!;
  const category = findCategory(draft.categoryId);
  const locked = saving || uncertain;
  const change = (patch: Partial<ExpenseDraft>) => { setDraft((current) => ({ ...current, ...patch })); setError(null); };
  const close = () => { if (!inFlight.current) onOpenChange(false); };
  const chooseCustom = (customMode: ExpenseDraft["customMode"]) => {
    const equal = active.length ? new Decimal(100).div(active.length).toDecimalPlaces(2, Decimal.ROUND_FLOOR) : new Decimal(0);
    const shares = allocations.length ? allocations : expensePreview({ ...draft, rule: "EqualParts" }, members);
    const custom = Object.fromEntries(active.map((member, index) => [member.id, customMode === "amount" ? shares.find((share) => share.memberId === member.id)?.amount ?? "0" : index === 0 ? new Decimal(100).minus(equal.mul(active.length - 1)).toString() : equal.toString()]));
    change({ rule: "CustomPercentage", customMode, custom });
  };
  let splitError: string | null = null;
  if (draft.rule === "IncomeProportional" && (!active.length || !Decimal.sum(...active.map((member) => member.incomeSharePercentage)).eq(100))) splitError = "Los porcentajes de ingresos deben sumar 100%. Revisa la configuración de integrantes.";
  if (draft.rule === "CustomPercentage") {
    try {
      const total = Decimal.sum(...active.map((member) => new Decimal(draft.custom[member.id] || "0")));
      if (!total.eq(draft.customMode === "amount" ? draft.amount || "0" : 100)) splitError = draft.customMode === "amount" ? "Los aportes deben sumar el monto total." : "Los porcentajes deben sumar 100%.";
    } catch { splitError = "Define una participación válida para cada integrante."; }
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current || uncertain) return;
    let request: RegisterWorkspaceExpenseRequest;
    try { request = buildExpenseRequest(draft, members, currency); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Revisa los datos del gasto."); return; }
    inFlight.current = true; setSaving(true); setError(null);
    try { await registerExpense(request); onOpenChange(false); }
    catch {
      // The hook can reject after the write committed, while refreshing data.
      setUncertain(true);
      setError("No se pudo confirmar el registro. Cierra y actualiza los gastos antes de volver a registrarlo para evitar duplicados.");
    } finally { inFlight.current = false; setSaving(false); }
  };
  return <ResponsiveDrawer open={open} onOpenChange={(value) => { if (!value) close(); }} hideCloseButton={saving} size="xl" title={categoryPanel === "create" ? "Crear categoría" : "Registrar gasto compartido"} description="Registra un nuevo gasto, define quién pagó y cómo se divide." footer={categoryPanel === "create" ? <><Button variant="outline" onClick={() => setCategoryPanel("picker")}>Volver</Button><Button type="submit" form="workspace-expense-category" disabled={!categoryValid}>Crear categoría</Button></> : <><Button variant="outline" disabled={saving} onClick={close}>Cancelar</Button><Button type="submit" form="workspace-expense" loading={saving} disabled={locked || !!splitError || !active.length}><Check />Registrar gasto</Button></>}>
    {categoryPanel === "create" ? <CategoryCreatorView formId="workspace-expense-category" direction="Expense" onCancel={() => setCategoryPanel("picker")} onValidityChange={setCategoryValid} onCreated={(created) => { change({ categoryId: created.id }); setCategoryPanel("closed"); }} /> : <form id="workspace-expense" onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <fieldset disabled={locked} className={`${workspacePanel} min-w-0 space-y-5`}>
        <h3 className="flex items-center gap-2 text-lg font-bold"><ReceiptText className="text-primary" />Registrar gasto compartido</h3>
        <FormField label="Descripción" required>{(control) => <Input {...control} required maxLength={200} value={draft.description} placeholder="¿En qué gastaron?" onChange={(event) => change({ description: event.target.value })} />}</FormField>
        <FormGrid>
          <div className="space-y-2"><FormField label="Categoría" required>{(control) => <SelectField {...control} required placeholder="Selecciona una categoría" value={draft.categoryId} options={getCategoriesByDirection("Expense").map((item) => ({ value: item.id, label: item.name }))} onChange={(event) => change({ categoryId: event.target.value })} />}</FormField><Button type="button" variant="link" size="xs" onClick={() => setCategoryPanel(categoryPanel === "picker" ? "closed" : "picker")}>Elegir o crear categoría</Button></div>
          <FormField label="Fecha" required>{(control) => <Input {...control} required type="date" value={draft.date} onChange={(event) => change({ date: event.target.value })} />}</FormField>
          <FormField label="Monto total" required>{(control) => <MoneyInput {...control} required currency={currency} value={draft.amount} onValueChange={(amount) => change({ amount })} />}</FormField>
          <FormField label="Pagado por" required>{(control) => <SelectField {...control} required value={draft.paidByMemberId} placeholder="Selecciona integrante" options={active.map((member) => ({ value: member.id, label: workspaceMemberLabel(members, member.id, viewerUserId) }))} onChange={(event) => change({ paidByMemberId: event.target.value })} />}</FormField>
        </FormGrid>
        {categoryPanel === "picker" && <CategoryPickerField direction="Expense" selectedCategoryId={draft.categoryId} onSelectCategory={(item) => change({ categoryId: item?.id ?? "" })} onRequestCreateCategory={() => setCategoryPanel("create")} />}
        <section className="space-y-3 border-t border-border pt-4"><h3 className="flex items-center gap-2 font-bold"><Users className="text-primary" />¿Cómo se divide el gasto?</h3>
          <div className="grid gap-2 sm:grid-cols-3">{expenseRules.map((item) => <Button key={item.value} type="button" variant={draft.rule === item.value ? "secondary" : "outline"} aria-pressed={draft.rule === item.value} className={`h-auto items-start justify-start whitespace-normal p-3 text-left ${draft.rule === item.value ? "border border-primary/50 bg-primary/20 text-primary" : ""}`} onClick={() => item.value === "CustomPercentage" ? chooseCustom(draft.customMode) : change({ rule: item.value })}><span><strong className="block text-xs">{item.label}</strong><span className="text-xs font-normal text-muted-foreground">{item.description}</span></span></Button>)}</div>
          <h4 className="text-sm font-semibold">Participación del gasto</h4>
          {draft.rule === "CustomPercentage" && <SegmentedControl aria-label="Personalizar participación" value={draft.customMode} onChange={chooseCustom} options={[{ value: "percentage", label: "Por porcentaje" }, { value: "amount", label: "Por monto" }]} />}
          <div className="space-y-2">{active.map((member) => {
            const allocation = allocations.find((item) => item.memberId === member.id);
            return <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 p-3"><WorkspaceMember members={members} id={member.id} viewerUserId={viewerUserId} />{draft.rule === "CustomPercentage" ? <div className="w-36"><FormField label={`${draft.customMode === "amount" ? "Monto" : "Porcentaje"} de ${workspaceMemberLabel(members, member.id, viewerUserId)}`}>{(control) => <MoneyInput {...control} currency={draft.customMode === "amount" ? currency : "%"} value={draft.custom[member.id] ?? ""} onValueChange={(value) => change({ custom: { ...draft.custom, [member.id]: value } })} />}</FormField></div> : <span className="text-sm tabular-nums">{allocation?.percentage ?? "—"}%</span>}<span className="text-sm font-semibold tabular-nums">{allocation ? workspaceMoney(allocation.amount, currency) : "—"}</span></div>;
          })}</div>
          {!active.length && <p role="alert" className="text-sm text-destructive">No hay integrantes activos para registrar un gasto.</p>}
          {splitError && <p role="alert" className="text-sm text-destructive">{splitError}</p>}
        </section>
        <FormField label="Notas (opcional)" hint={`${draft.notes.length} / 300`}>{(control) => <Textarea {...control} maxLength={300} rows={3} placeholder="Agrega una nota, enlace del recibo o detalle adicional…" value={draft.notes} onChange={(event) => change({ notes: event.target.value })} />}</FormField>
        {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </fieldset>
      <aside className="min-w-0 space-y-4" aria-live="polite"><section className={`${workspacePanel} space-y-4`}><ShoppingCart className="mx-auto my-3 size-12 text-primary" aria-hidden="true" /><h3 className="text-lg font-bold">Resumen del gasto</h3><p className="break-words text-sm">{draft.description || "Sin descripción"}</p><dl className="divide-y divide-border text-sm">{[["Categoría", category?.name ?? "Sin seleccionar"], ["Monto total", /^\d+(\.\d{1,2})?$/.test(draft.amount) ? workspaceMoney(draft.amount, currency) : "—"], ["División", rule.label]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-bold">{label === "División" ? <Badge variant="secondary">{value}</Badge> : value}</dd></div>)}</dl><h4 className="border-t border-border pt-4 font-bold">Aporte por integrante</h4>{active.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-2"><WorkspaceMember members={members} id={member.id} viewerUserId={viewerUserId} /><strong className="text-sm text-primary">{!splitError && allocations.find((item) => item.memberId === member.id) ? workspaceMoney(allocations.find((item) => item.memberId === member.id)!.amount, currency) : "—"}</strong></div>)}</section><section className={`${workspacePanel} border-primary/30 bg-primary/5`}><h3 className="mb-2 flex items-center gap-2 font-bold"><Info className="size-5 text-primary" />Impacto en el presupuesto</h3><p className="text-sm text-muted-foreground">{category ? `Este gasto se registrará en ${category.name}. Si existe un presupuesto compartido para la fecha elegida, se actualizará su monto disponible.` : "Selecciona una categoría para ver dónde se registrará el gasto. El servidor actualizará el presupuesto correspondiente."}</p></section></aside>
    </form>}
  </ResponsiveDrawer>;
}
