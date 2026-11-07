"use client";

import React, { useState, useEffect } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import { Investment } from "../../domain/investment.types";
import {
  CATEGORY_COLOR_LIST,
  CategoryColorKey,
  CategoryIconKey,
} from "@/modules/ledger/domain/category.types";
import { ACCOUNT_ICON_CHOICES } from "@/modules/ledger/domain/account-meta";
import { CategoryIcon } from "@/modules/ledger/presentation/CategoryIcon";

interface EditInvestmentModalProps {
  investment: Investment | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

const EXTENDED_ICONS: { key: CategoryIconKey; label: string }[] = [
  ...ACCOUNT_ICON_CHOICES,
  { key: "home" as CategoryIconKey, label: "Inmueble" },
  { key: "laptop" as CategoryIconKey, label: "Tecnología" },
  { key: "car" as CategoryIconKey, label: "Vehículo" },
  { key: "gift" as CategoryIconKey, label: "Colección" },
];

export function EditInvestmentModal({
  investment,
  isOpen,
  onClose,
  onDelete,
}: EditInvestmentModalProps) {
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<CategoryIconKey>("coins");
  const [colorKey, setColorKey] = useState<CategoryColorKey>("amber");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (investment && isOpen) {
      setName(investment.name);
      setIconKey(investment.iconKey as CategoryIconKey);
      setColorKey(investment.colorKey as CategoryColorKey);
      setConfirmDelete(false);
    }
  }, [investment, isOpen]);

  if (!isOpen || !investment) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await onDelete(investment.id);
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
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Editar inversión
              </h2>
              <p className="text-xs text-muted-foreground">{investment.name}</p>
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
        <div className="p-5 flex flex-col gap-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">Nombre del activo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground text-sm font-semibold outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Color & Icon Picker */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Color representativo</span>
              <div className="flex items-center gap-1.5">
                {CATEGORY_COLOR_LIST.slice(0, 7).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    title={c.label}
                    onClick={() => setColorKey(c.key)}
                    className={`w-5 h-5 rounded-full transition cursor-pointer ${
                      colorKey === c.key
                        ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110"
                        : "opacity-75 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.swatchHex }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {EXTENDED_ICONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  onClick={() => setIconKey(item.key)}
                  className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                    iconKey === item.key
                      ? "bg-purple-600/20 border-purple-500 text-purple-300 ring-1 ring-purple-500/40"
                      : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <CategoryIcon iconKey={item.key} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Archive / Delete Section */}
          <div className="pt-3 border-t border-border/60">
            {confirmDelete ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-[11px] font-semibold text-rose-300">
                  ¿Confirmás archivar esta inversión?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitting}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                  >
                    Sí, archivar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Archivar inversión</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
