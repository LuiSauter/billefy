"use client";

import { useState, useEffect } from "react";
import Decimal from "decimal.js";
import { X, Scale, Check, ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import { AccountDto } from "@/domain/models/types";

interface ReconcileModalProps {
  isOpen: boolean;
  account: AccountDto | null;
  onClose: () => void;
  onSubmit: (accountId: string, realBalance: number, notes?: string) => Promise<void>;
}

const inputClass =
  "h-[42px] px-3.5 rounded-[10px] border border-border bg-white text-sm font-semibold text-foreground placeholder:text-slate-400 placeholder:font-medium focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-blue-600/10 transition";

export function ReconcileModal({ isOpen, account, onClose, onSubmit }: ReconcileModalProps) {
  const [realBalance, setRealBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setRealBalance(account.balance.toString());
      setNotes("");
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const realNum = parseFloat(realBalance);
  const isValid = !isNaN(realNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      await onSubmit(account.id, realNum, notes.trim() || undefined);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const diff = isValid ? new Decimal(realBalance).minus(account.balance) : new Decimal(0);
  const isPositive = diff.gt(0);
  const isNegative = diff.lt(0);

  const tone = isPositive
    ? {
        box: "bg-green-50 border-green-200",
        label: "text-green-800",
        value: "text-green-700",
        icon: "bg-[#DCFCE7] text-green-700",
        Icon: ArrowUpRight,
        hint: "Se registrará un ajuste a favor (ingreso)",
      }
    : isNegative
      ? {
          box: "bg-rose-50 border-rose-200",
          label: "text-[#9F1239]",
          value: "text-rose-600",
          icon: "bg-[#FFE4E6] text-rose-600",
          Icon: ArrowDownRight,
          hint: "Se registrará un ajuste en contra (egreso)",
        }
      : {
          box: "bg-background border-border",
          label: "text-muted-foreground",
          value: "text-slate-600",
          icon: "bg-slate-100 text-muted-foreground",
          Icon: Equal,
          hint: "Los saldos coinciden, no se requiere ajuste",
        };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="w-full max-w-[480px] shadow-2xl bg-white border border-border rounded-[20px] p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-[12px] bg-blue-50 text-primary flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[17px] font-extrabold text-foreground tracking-tight leading-tight">
                Conciliar Saldo
              </h2>
              <p className="text-sm font-semibold text-muted-foreground truncate">{account.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 shrink-0 rounded-lg text-muted-foreground hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Current ledger balance */}
          <div className="p-3.5 rounded-[14px] bg-background border border-border flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-muted-foreground">Saldo en el Libro Mayor</span>
              <span className="text-xs font-medium text-slate-500">Calculado por Billefy</span>
            </div>
            <span className="font-mono text-[18px] font-black text-foreground whitespace-nowrap">
              {account.balance.toFixed(2)}{" "}
              <span className="text-sm font-bold text-muted-foreground">{account.currency}</span>
            </span>
          </div>

          {/* Real balance */}
          <div className="flex flex-col gap-1">
            <label htmlFor="reconcileRealBalance" className="text-xs font-bold text-slate-600">
              Saldo real verificado ({account.currency})
            </label>
            <input
              id="reconcileRealBalance"
              type="number"
              step="0.01"
              required
              value={realBalance}
              onChange={(e) => setRealBalance(e.target.value)}
              placeholder="0.00"
              className={`${inputClass} font-mono text-[15px] font-extrabold`}
            />
            <span className="text-xs font-medium text-slate-500">
              Ingresá el saldo que figura en tu extracto o billetera.
            </span>
          </div>

          {/* Computed difference */}
          <div className={`p-3.5 rounded-[14px] border flex items-center gap-3 ${tone.box}`}>
            <div
              className={`w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center ${tone.icon}`}
            >
              <tone.Icon className="w-[18px] h-[18px]" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className={`text-xs font-bold ${tone.label}`}>Diferencia calculada</span>
              <span className={`text-xs font-medium ${tone.label} opacity-80`}>{tone.hint}</span>
            </div>
            <span className={`font-mono text-[16px] font-black whitespace-nowrap ${tone.value}`}>
              {isPositive ? "+" : ""}
              {diff.toFixed(2)} <span className="text-xs font-bold">{account.currency}</span>
            </span>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label htmlFor="reconcileNotes" className="text-xs font-bold text-slate-600">
              Nota o motivo <span className="font-medium text-slate-500">(opcional)</span>
            </label>
            <input
              id="reconcileNotes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Extracto mensual del banco"
              className={inputClass}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-[40px] px-4 rounded-[10px] border border-border text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !isValid}
              className="h-[40px] px-5 rounded-[10px] bg-primary hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-bold transition disabled:opacity-50 flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{submitting ? "Conciliando..." : "Aplicar Ajuste"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
