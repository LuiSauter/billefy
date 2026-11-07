"use client";

import React, { useState } from "react";
import { Bell, Plus, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";
import { InvestmentAlert } from "../../domain/investment-detail";

interface InvestmentPriceAlertsCardProps {
  investmentId: string;
  currencySymbol?: string;
}

export function InvestmentPriceAlertsCard({
  investmentId,
  currencySymbol = "$",
}: InvestmentPriceAlertsCardProps) {
  const [alerts, setAlerts] = useState<InvestmentAlert[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTarget, setNewTarget] = useState("");
  const [newCondition, setNewCondition] = useState<"above" | "below">("above");

  const toggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newTarget);
    if (!val || val <= 0) return;

    setAlerts((prev) => [
      ...prev,
      {
        id: `alt-${Date.now()}`,
        investmentId,
        condition: newCondition,
        targetPrice: val,
        active: true,
      },
    ]);
    setNewTarget("");
    setIsAdding(false);
  };

  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-2xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple-400" />
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Alertas de precio
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs font-bold text-purple-400 hover:text-purple-300 transition cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Crear alerta</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddAlert} className="flex flex-col gap-2.5 p-3 rounded-xl bg-muted/60 border border-border/80 text-xs">
          <div className="flex items-center gap-2">
            <select
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value as "above" | "below")}
              className="h-8 px-2 rounded-lg bg-card border border-border text-xs font-semibold text-foreground outline-none cursor-pointer"
            >
              <option value="above">Si sube a</option>
              <option value="below">Si baja a</option>
            </select>
            <input
              type="number"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="70000"
              className="h-8 px-3 rounded-lg bg-card border border-border text-xs font-mono font-bold text-foreground flex-1 outline-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {alerts.map((alt) => {
          const isAbove = alt.condition === "above";
          return (
            <div
              key={alt.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isAbove ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="text-xs font-medium text-foreground truncate">
                  Si el precio {isAbove ? "sube" : "baja"} a{" "}
                  <strong className="font-mono font-bold">
                    {currencySymbol} {alt.targetPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => toggleAlert(alt.id)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    alt.active ? "bg-purple-600" : "bg-muted-foreground/30"
                  }`}
                  title={alt.active ? "Alerta activada" : "Alerta desactivada"}
                >
                  <span
                    className={`block w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 left-0.5 ${
                      alt.active ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => removeAlert(alt.id)}
                  className="p-1 text-muted-foreground/60 hover:text-rose-400 transition cursor-pointer"
                  title="Eliminar alerta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && !isAdding && (
          <div className="p-3 text-center text-xs text-muted-foreground bg-muted/30 rounded-xl border border-border/50">
            No tienes alertas configuradas aún.
          </div>
        )}
      </div>
    </div>
  );
}
