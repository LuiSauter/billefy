"use client";

import React, { useState } from "react";
import { X, Plus, Home, Car, Laptop, Sparkles } from "lucide-react";
import { AssetCategory, PatrimonialAsset } from "../../domain/patrimonio.types";
import { normalizeAmountString } from "@/shared/lib/keypad";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAsset: (asset: Omit<PatrimonialAsset, "id" | "createdAt">) => Promise<void>;
  currencySymbol?: string;
  defaultCurrency?: "BOB" | "USD";
}

const CATEGORIES: { key: AssetCategory; label: string; icon: React.ElementType }[] = [
  { key: "realestate", label: "Inmuebles", icon: Home },
  { key: "vehicles", label: "Vehículos", icon: Car },
  { key: "digital", label: "Activos digitales", icon: Laptop },
  { key: "other", label: "Otros / Colección", icon: Sparkles },
];

function toNumber(raw: string): number {
  const n = parseFloat(normalizeAmountString(raw.trim()) || "0");
  return Number.isFinite(n) ? n : 0;
}

export function AddAssetModal({
  isOpen,
  onClose,
  onAddAsset,
  currencySymbol = "$",
  defaultCurrency = "USD",
}: AddAssetModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory>("realestate");
  const [valueStr, setValueStr] = useState("");
  const [currency, setCurrency] = useState<"BOB" | "USD">(defaultCurrency || (currencySymbol === "Bs." ? "BOB" : "USD"));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setCurrency(defaultCurrency || (currencySymbol === "Bs." ? "BOB" : "USD"));
    }
  }, [isOpen, defaultCurrency, currencySymbol]);

  if (!isOpen) return null;

  const valid = name.trim().length > 0 && toNumber(valueStr) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setSubmitting(true);
    try {
      await onAddAsset({
        name: name.trim(),
        category,
        value: toNumber(valueStr),
        currency,
        notes: notes.trim() || undefined,
      });
      setName("");
      setValueStr("");
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
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Agregar activo patrimonial
              </h2>
              <p className="text-xs text-muted-foreground">
                Inmuebles propios, vehículos, activos digitales o tangibles.
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
            <label className="font-semibold text-foreground">Categoría del activo</label>
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
                        ? "bg-purple-600/20 border-purple-500 text-purple-300 font-bold"
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
            <label className="font-semibold text-foreground">Nombre o descripción</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Casa familiar, Toyota RAV4 2024, Dominios"
              className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground text-sm font-semibold outline-none focus:border-purple-500 transition"
              autoFocus
            />
          </div>

          {/* Currency Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">Moneda del activo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCurrency("BOB")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  currency === "BOB"
                    ? "bg-purple-600/15 border-purple-500 text-purple-300 ring-2 ring-purple-500/30"
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
                    ? "bg-purple-600/15 border-purple-500 text-purple-300 ring-2 ring-purple-500/30"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>Dólares (USD - $)</span>
              </button>
            </div>
          </div>

          {/* Estimated Value */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">
              Valor estimado de mercado ({currency === "BOB" ? "Bs." : "$"})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-mono font-bold">
                {currency === "BOB" ? "Bs." : "$"}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={valueStr}
                onChange={(e) => setValueStr(e.target.value)}
                placeholder="85,000.00"
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-muted/40 border border-border text-foreground font-mono font-bold text-sm outline-none focus:border-purple-500 transition"
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
              placeholder="Detalles sobre valuación, fecha de compra, etc."
              className="w-full p-2.5 rounded-xl bg-muted/40 border border-border text-foreground text-xs outline-none focus:border-purple-500 transition resize-none"
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
              className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              {submitting ? "Guardando..." : "Guardar activo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
