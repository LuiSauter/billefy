"use client";

import React, { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { CategoryPickerField } from "@/modules/ledger/presentation/CategoryPickerField";
import { CategoryCreatorView } from "@/modules/ledger/presentation/CategoryCreatorView";
import type { SetSharedBudgetRequest, SharedBudgetDto } from "../domain/workspaces.types";
import { buildWorkspaceBudgetRequest, type WorkspaceBudgetDraft } from "./workspace-budget";
import { WorkspaceCategory, workspacePeriodLabel } from "./workspace-view-ui";

interface Props {
  budget: SharedBudgetDto | null;
  year: number;
  month: number;
  currency: string;
  onClose: () => void;
  setBudget: (request: SetSharedBudgetRequest) => Promise<unknown>;
}
/** Mount keyed by workspace/period so unsaved limits cannot cross contexts. */
export function ConfigureWorkspaceBudgetModal({ budget, year, month, currency, onClose, setBudget }: Props) {
  const [draft, setDraft] = useState<WorkspaceBudgetDraft>(() => ({ amount: budget ? String(budget.amount) : "", categories: budget?.categories.map((category) => ({ categoryId: category.categoryId, limitAmount: String(category.limitAmount) })) ?? [] }));
  const [panel, setPanel] = useState<"closed" | "picker" | "create">("closed");
  const [categoryValid, setCategoryValid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const locked = saving || uncertain;
  const addCategory = (id: string) => {
    setDraft((current) => current.categories.some((category) => category.categoryId === id) ? current : { ...current, categories: [...current.categories, { categoryId: id, limitAmount: "" }] });
    setPanel("closed");
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current || uncertain) return;
    let request: SetSharedBudgetRequest;
    try { request = buildWorkspaceBudgetRequest(draft, year, month, currency); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Revisa el presupuesto."); return; }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try { await setBudget(request); onClose(); }
    catch {
      setUncertain(true);
      setError("No se pudo confirmar el presupuesto. Cierra y actualiza los datos antes de volver a guardar.");
    } finally { inFlight.current = false; setSaving(false); }
  };
  return <ResponsiveDrawer open onOpenChange={(open) => { if (!open && !inFlight.current) onClose(); }} hideCloseButton={saving} title={panel === "create" ? "Crear categoría" : "Configurar presupuesto"} description={workspacePeriodLabel(year, month)} footer={panel === "create" ? <><Button variant="outline" onClick={() => setPanel("picker")}>Volver</Button><Button form="workspace-budget-category" type="submit" disabled={!categoryValid}>Crear categoría</Button></> : <><Button variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button form="workspace-budget" type="submit" disabled={locked} loading={saving}>Guardar presupuesto</Button></>}>
    {panel === "create" ? <CategoryCreatorView formId="workspace-budget-category" direction="Expense" onCancel={() => setPanel("picker")} onValidityChange={setCategoryValid} onCreated={(category) => addCategory(category.id)} /> : <form id="workspace-budget" onSubmit={submit} className="space-y-4"><fieldset disabled={locked} className="space-y-4">
      <FormField label="Total presupuestado" required>{(control) => <MoneyInput {...control} required currency={currency} value={draft.amount} onValueChange={(amount) => setDraft((current) => ({ ...current, amount }))} />}</FormField>
      <h3 className="font-bold">Presupuesto por categoría</h3>
      {draft.categories.map((category) => <div key={category.categoryId} className="flex items-end gap-3 rounded-xl border border-border p-3"><div className="min-w-0 flex-1"><WorkspaceCategory id={category.categoryId} /><div className="mt-2"><FormField label="Límite de categoría" required>{(control) => <MoneyInput {...control} required currency={currency} value={category.limitAmount} onValueChange={(limitAmount) => setDraft((current) => ({ ...current, categories: current.categories.map((item) => item.categoryId === category.categoryId ? { ...item, limitAmount } : item) }))} />}</FormField></div></div><Button variant="ghost" size="icon" aria-label="Quitar límite de categoría" onClick={() => setDraft((current) => ({ ...current, categories: current.categories.filter((item) => item.categoryId !== category.categoryId) }))}><X /></Button></div>)}
      <Button variant="outline" onClick={() => setPanel(panel === "picker" ? "closed" : "picker")}><Plus />Agregar categoría</Button>
      {panel === "picker" && <CategoryPickerField direction="Expense" selectedCategoryId="" onSelectCategory={(category) => { if (category) addCategory(category.id); }} onRequestCreateCategory={() => setPanel("create")} />}
      <p className="text-xs text-muted-foreground">Guardar reemplaza los límites del mes seleccionado. Los gastos registrados no se modifican.</p>
    </fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>}
  </ResponsiveDrawer>;
}
