"use client";

import React, { useState } from "react";
import { FormField } from "@/shared/ui/form-field";
import { Button } from "@/shared/ui/button";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { CategoryPickerField } from "@/modules/ledger/presentation/CategoryPickerField";
import { CategoryCreatorView } from "@/modules/ledger/presentation/CategoryCreatorView";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import type { CreateSharedGoalRequest } from "../domain/workspaces.types";
import { buildSharedGoalRequest, type SharedGoalDraft } from "./workspace-goals";
import { WorkspaceMutationDrawer } from "./WorkspaceMutationDrawer";

export function CreateSharedGoalModal({ currency, createGoal, onClose }: { currency: string; createGoal: (request: CreateSharedGoalRequest) => Promise<unknown>; onClose: () => void }) {
  const [draft, setDraft] = useState<SharedGoalDraft>({ title: "", targetAmount: "", monthlyCommitmentAmount: "0", targetDate: "", category: "" });
  const [categoryId, setCategoryId] = useState("");
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [categoryValid, setCategoryValid] = useState(false);
  const patch = (key: keyof SharedGoalDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  if (creatorOpen) return <ResponsiveDrawer open title="Crear categoría" description="Organiza sus metas con una categoría." onOpenChange={(open) => { if (!open) setCreatorOpen(false); }} footer={<><Button variant="outline" onClick={() => setCreatorOpen(false)}>Volver a la meta</Button><Button form="shared-goal-category" type="submit" disabled={!categoryValid}>Crear categoría</Button></>}><CategoryCreatorView formId="shared-goal-category" direction="Expense" onCancel={() => setCreatorOpen(false)} onValidityChange={setCategoryValid} onCreated={(category) => { setCategoryId(category.id); patch("category", category.name); setCreatorOpen(false); }} /></ResponsiveDrawer>;
  return <WorkspaceMutationDrawer title="Nueva meta compartida" description="Definan el objetivo y su compromiso de ahorro." formId="create-shared-goal" submitLabel="Crear meta" onClose={onClose} prepare={() => { const request = buildSharedGoalRequest(draft, currency); return () => createGoal(request); }}>
    <FormField label="Nombre de la meta" required>{(control) => <Input {...control} required maxLength={150} value={draft.title} onChange={(event) => patch("title", event.target.value)} />}</FormField>
    <FormField label="Monto objetivo" required>{(control) => <MoneyInput {...control} required currency={currency} value={draft.targetAmount} onValueChange={(value) => patch("targetAmount", value)} />}</FormField>
    <FormField label="Aporte mensual">{(control) => <MoneyInput {...control} currency={currency} value={draft.monthlyCommitmentAmount} onValueChange={(value) => patch("monthlyCommitmentAmount", value)} />}</FormField>
    <FormField label="Fecha objetivo">{(control) => <Input {...control} type="date" value={draft.targetDate} onChange={(event) => patch("targetDate", event.target.value)} />}</FormField>
    <div className="space-y-3"><h3 className="text-sm font-semibold">Categoría de la meta (opcional)</h3><CategoryPickerField direction="Expense" selectedCategoryId={categoryId} onSelectCategory={(category) => { setCategoryId(category?.id ?? ""); patch("category", category?.name ?? ""); }} onRequestCreateCategory={() => setCreatorOpen(true)} />{categoryId && <Button variant="ghost" onClick={() => { setCategoryId(""); patch("category", ""); }}>Quitar categoría</Button>}<p className="text-xs text-muted-foreground">Se guarda el nombre de la categoría en la meta, no un gasto ni una referencia al catálogo personal.</p></div>
    <p className="text-xs text-muted-foreground">El aporte mensual crea un recordatorio en el calendario. No realiza transferencias automáticas.</p>
  </WorkspaceMutationDrawer>;
}
