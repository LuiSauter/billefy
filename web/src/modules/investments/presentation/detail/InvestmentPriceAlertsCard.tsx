"use client";

import React, { useState } from "react";
import { Bell, Plus, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";
import { InvestmentAlert } from "../../domain/investment-detail";
import { toNumber } from "../parse-amount-input";
import { Amount } from "@/shared/ui/amount";
import { Button } from "@/shared/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { SelectField, type SelectFieldOption } from "@/shared/ui/select-field";
import { Switch } from "@/shared/ui/switch";
import {
  appCardContentClassName,
  appCardHeaderClassName,
  appCardTitleClassName,
} from "@/shared/presentation/card-variants";
import { InvestmentsCard } from "../InvestmentsCard";

interface InvestmentPriceAlertsCardProps {
  investmentId: string;
  currency?: string;
  /** Persisted alerts. */
  alerts?: InvestmentAlert[];
  /**
   * Handlers that really store / evaluate alerts. Without `onCreateAlert` the card shows that alerts
   * are not available yet instead of keeping throw-away local state that no one would ever evaluate.
   */
  onCreateAlert?: (alert: { condition: "above" | "below"; targetPrice: number }) => Promise<void> | void;
  onToggleAlert?: (id: string) => void;
  onRemoveAlert?: (id: string) => void;
}

const CONDITION_OPTIONS: SelectFieldOption[] = [
  { value: "above", label: "Si sube a" },
  { value: "below", label: "Si baja a" },
];

export function InvestmentPriceAlertsCard({
  currency = "USD",
  alerts = [],
  onCreateAlert,
  onToggleAlert,
  onRemoveAlert,
}: InvestmentPriceAlertsCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTarget, setNewTarget] = useState("");
  const [newCondition, setNewCondition] = useState<"above" | "below">("above");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = toNumber(newTarget);
    if (!onCreateAlert || val <= 0) return;
    setSaving(true);
    setError("");
    try {
      await onCreateAlert({ condition: newCondition, targetPrice: val });
      setNewTarget("");
      setIsAdding(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar la alerta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <InvestmentsCard className="@container">
      <CardHeader className={`${appCardHeaderClassName} flex flex-row items-center justify-between space-y-0`}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple-400" aria-hidden="true" />
          <CardTitle className={appCardTitleClassName}>Alertas de precio</CardTitle>
        </div>

        {onCreateAlert && (
          <Button type="button" variant="ghost" size="xs" className="text-purple-400" onClick={() => setIsAdding(!isAdding)}>
            <Plus aria-hidden="true" />
            <span>Crear alerta</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className={`${appCardContentClassName} flex flex-col gap-3`}>
        {isAdding && onCreateAlert && (
          <form onSubmit={handleAddAlert} className="flex flex-col gap-2.5 p-3 rounded-xl bg-muted/60 border border-border/80 text-xs">
            <div className="flex flex-col @sm:flex-row gap-2">
              <SelectField
                aria-label="Condición de la alerta"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as "above" | "below")}
                options={CONDITION_OPTIONS}
              />
              <Input
                aria-label="Precio objetivo"
                inputMode="decimal"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder="70000"
                autoFocus
              />
            </div>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="xs" disabled={saving} onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="xs" loading={saving} disabled={toNumber(newTarget) <= 0}>
                Guardar
              </Button>
            </div>
          </form>
        )}

        {alerts.map((alt) => {
          const isAbove = alt.condition === "above";
          return (
            <div
              key={alt.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isAbove ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                )}
                <span className="text-xs font-medium text-foreground truncate">
                  Si el precio {isAbove ? "sube" : "baja"} a{" "}
                  <strong className="font-bold">
                    <Amount value={alt.targetPrice} currency={currency} size="inherit" tone="inherit" />
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  size="sm"
                  checked={alt.active}
                  disabled={!onToggleAlert}
                  onCheckedChange={() => onToggleAlert?.(alt.id)}
                  aria-label={alt.active ? "Alerta activada" : "Alerta desactivada"}
                />
                {onRemoveAlert && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    title="Eliminar alerta"
                    aria-label="Eliminar alerta"
                    onClick={() => onRemoveAlert(alt.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {!onCreateAlert && alerts.length === 0 && (
          <div className="p-3 text-center text-xs text-muted-foreground bg-muted/30 rounded-xl border border-border/50">
            Las alertas de precio todavía no están disponibles. Estarán listas próximamente.
          </div>
        )}
        {onCreateAlert && alerts.length === 0 && !isAdding && (
          <div className="p-3 text-center text-xs text-muted-foreground bg-muted/30 rounded-xl border border-border/50">
            No tienes alertas configuradas aún.
          </div>
        )}
      </CardContent>
    </InvestmentsCard>
  );
}
