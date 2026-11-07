"use client";

import React, { useState } from "react";
import { X, Landmark, Home, User, CreditCard, MoreHorizontal } from "lucide-react";
import { LiabilityCategory, PatrimonialLiability } from "../../domain/patrimonio.types";
import { normalizeAmountString } from "@/shared/lib/keypad";

interface AddLiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLiability: (liability: Omit<PatrimonialLiability, "id" | "createdAt">) => Promise<void>;
  currencySymbol?: string;
  defaultCurrency?: "BOB" | "USD";
}

const CATEGORIES: { key: LiabilityCategory; label: string; icon: React.ElementType }[] = [
  { key: "mortgage", label: "Crédito hipotecario", icon: Home },
  { key: "loan", label: "Préstamo personal", icon: User },
  { key: "creditcard", label: "Tarjeta de crédito", icon: CreditCard },
  { key: "other", label: "Otros pasivos", icon: MoreHorizontal },
];

function toNumber(raw: string): number {
  const n = parseFloat(normalizeAmountString(raw.trim()) || "0");
  return Number.isFinite(n) ? n : 0;
}

export function AddLiabilityModal({
  isOpen,
  onClose,
  onAddLiability,
  currencySymbol = "$",
  defaultCurrency = "USD",
}: AddLiabilityModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<LiabilityCategory>("loan");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<"BOB" | "USD">(defaultCurrency || (currencySymbol === "Bs." ? "BOB" : "USD"));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setCurrency(defaultCurrency || (currencySymbol === "Bs." ? "BOB" : "USD"));
    }
  }, [isOpen, defaultCurrency, currencySymbol]);

  if (!isOpen) return null;

  const valid = name.trim().length > 0 && toNumber(amountStr) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setSubmitting(true);
    try {
      await onAddLiability({
        name: name.trim(),
        category,
        amount: toNumber(amountStr),
        currency,
        notes: notes.trim() || undefined,
      });
      setName("");
      setAmountStr("");
      setNotes("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Registrar pasivo o deuda
              </h2>
              <p className="text-xs text-muted-foreground">
                Hipotecas, préstamos, deudas de tarjeta o compromisos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
          {/* Category Picker */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-foreground">Tipo de pasivo</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const isSelected = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                      isSelected
                        ? "bg-rose-500/20 border-rose-500 text-rose-300 font-bold"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">Acreedor o concepto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Crédito hipotecario Santander, Deuda tarjeta"
              className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground text-sm font-semibold outline-none focus:border-rose-500 transition"
              autoFocus
            />
          </div>

          {/* Currency Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">Moneda del pasivo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCurrency("BOB")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  currency === "BOB"
                    ? "bg-rose-600/15 border-rose-500 text-rose-300 ring-2 ring-rose-500/30"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>Bolivianos (BOB - Bs.)</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  currency === "USD"
                    ? "bg-rose-600/15 border-rose-500 text-rose-300 ring-2 ring-rose-500/30"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>Dólares (USD - $)</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">
              Monto adeudado actual ({currency === "BOB" ? "Bs." : "$"})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-mono font-bold">
                {currency === "BOB" ? "Bs." : "$"}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="20,000.00"
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono font-bold text-sm outline-none focus:border-rose-500 transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Tasa de interés, plazo o condiciones..."
              className="w-full p-2.5 rounded-xl bg-muted/40 border border-border text-foreground text-xs outline-none focus:border-rose-500 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70 mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-10 px-4 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!valid || submitting}
              className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20 cursor-pointer"
            >
              {submitting ? "Guardando..." : "Guardar pasivo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
