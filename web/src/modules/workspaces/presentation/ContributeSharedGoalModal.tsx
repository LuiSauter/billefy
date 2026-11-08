"use client";

import React, { useState } from "react";
import { FormField } from "@/shared/ui/form-field";
import { MoneyInput } from "@/shared/ui/money-input";
import type { ContributeSharedGoalRequest, SharedGoalDto } from "../domain/workspaces.types";
import { buildGoalContributionRequest } from "./workspace-goals";
import { workspaceMoney } from "./workspace-ui";
import { WorkspaceMutationDrawer } from "./WorkspaceMutationDrawer";

export function ContributeSharedGoalModal({ goal, contributeGoal, onClose }: { goal: SharedGoalDto; contributeGoal: (goalId: string, request: ContributeSharedGoalRequest) => Promise<unknown>; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  return <WorkspaceMutationDrawer title="Aportar a meta compartida" description={goal.title} formId="contribute-shared-goal" submitLabel="Confirmar aporte" onClose={onClose} prepare={() => {
    if (goal.status !== "Active") throw new Error("Solo las metas activas aceptan aportes.");
    const request = buildGoalContributionRequest(amount, goal.currency);
    return () => contributeGoal(goal.id, request);
  }}><p className="text-sm text-muted-foreground">Ahorrado: {workspaceMoney(goal.currentAmount, goal.currency)} · Objetivo: {workspaceMoney(goal.targetAmount, goal.currency)}</p><FormField label="Monto del aporte" required>{(control) => <MoneyInput {...control} required currency={goal.currency} value={amount} onValueChange={setAmount} />}</FormField><p className="text-xs text-muted-foreground">El aporte se registra a tu nombre. No se debita una cuenta personal ni se realiza una transferencia bancaria.</p></WorkspaceMutationDrawer>;
}
