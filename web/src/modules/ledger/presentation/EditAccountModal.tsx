"use client";

import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import {
  ACCOUNT_ICON_CHOICES,
  resolveAccountVisualMeta,
} from "@/modules/ledger/domain/account-meta";
import {
  CATEGORY_COLOR_LIST,
  CategoryColorKey,
  CategoryIconKey,
} from "@/modules/ledger/domain/category.types";
import { CategoryIcon, CategoryIconBadge } from "./CategoryIcon";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";

interface EditAccountModalProps {
  account: AccountDto | null;
  onClose: () => void;
  onSubmit: (
    accountId: string,
    data: { name: string; iconKey: string; colorKey: string }
  ) => Promise<void>;
  onDelete?: (accountId: string) => Promise<void>;
}

const FORM_ID = "edit-account-form";

export function EditAccountModal({ account, onClose, onSubmit, onDelete }: EditAccountModalProps) {
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<CategoryIconKey>("wallet");
  const [colorKey, setColorKey] = useState<CategoryColorKey>("cyan");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      const meta = resolveAccountVisualMeta(account);
      setName(account.name);
      setIconKey(meta.iconKey);
      setColorKey(meta.colorKey);
    }
  }, [account]);

  if (!account) return null;
  const valid = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    try {
      await onSubmit(account.id, { name: name.trim(), iconKey, colorKey });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open
      onOpenChange={(open) => !open && onClose()}
      title="Editar cuenta"
      description="Cambiá el nombre, el ícono o el color. El saldo y la moneda no se modifican."
      size="md"
      footer={
        <Button
          type="submit"
          form={FORM_ID}
          size="lg"
          loading={submitting}
          disabled={!valid}
          className="w-full"
        >
          Guardar cambios
        </Button>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border">
          <CategoryIconBadge iconKey={iconKey} colorKey={colorKey} size="lg" />
          <span className="text-sm font-extrabold text-foreground truncate">
            {name.trim() || "Nombre de tu cuenta"}
          </span>
        </div>

        <FormField label="Nombre de la cuenta" required>
          {(control) => (
            <Input
              {...control}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          )}
        </FormField>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Ícono y color</span>
            <div className="flex items-center gap-1.5">
              {CATEGORY_COLOR_LIST.slice(0, 7).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  onClick={() => setColorKey(c.key)}
                  className={`w-5 h-5 rounded-full transition ${
                    colorKey === c.key
                      ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                      : "opacity-75 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.swatchHex }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {ACCOUNT_ICON_CHOICES.map((item) => (
              <button
                key={item.key}
                type="button"
                title={item.label}
                onClick={() => setIconKey(item.key)}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  iconKey === item.key
                    ? "bg-accent border-primary text-primary ring-1 ring-primary/40"
                    : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <CategoryIcon iconKey={item.key} className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {onDelete && (
          <div className="pt-4 border-t border-border/60">
            {confirmDelete ? (
              <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30">
                <span className="text-xs font-bold text-destructive">
                  ¿Confirmás eliminar la cuenta «{account.name}»?
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Si tiene transacciones registradas, será archivada para conservar tu historial contable. Si no tiene movimientos, se eliminará permanentemente.
                </p>
                <div className="flex justify-end gap-2 mt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={submitting}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    loading={submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        await onDelete(account.id);
                        onClose();
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    Sí, eliminar cuenta
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar cuenta</span>
              </Button>
            )}
          </div>
        )}
      </form>
    </ResponsiveDrawer>
  );
}
