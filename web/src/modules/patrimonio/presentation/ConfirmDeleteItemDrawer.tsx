"use client";

import React, { useState } from "react";
import { Button } from "@/shared/ui/button";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";

export interface PendingDeletion {
  id: string;
  name: string;
}

interface ConfirmDeleteItemDrawerProps {
  /** Item pending deletion; `null` keeps the confirmation closed. */
  item: PendingDeletion | null;
  /** "activo" or "pasivo": drives the copy. */
  noun: "activo" | "pasivo";
  onConfirm: (id: string) => void | Promise<void>;
  onClose: () => void;
}

/** Confirmation drawer for removing a manual asset/liability (same pattern as DeleteAccountConfirmation in Ledger). */
export function ConfirmDeleteItemDrawer({ item, noun, onConfirm, onClose }: ConfirmDeleteItemDrawerProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!item) return;
    setDeleting(true);
    try {
      await onConfirm(item.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={!!item}
      onOpenChange={(open) => !open && onClose()}
      title={`Eliminar ${noun}`}
      description={`Confirmación de baja de ${noun} manual`}
      size="sm"
      footer={
        <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={deleting} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="button" variant="destructive" loading={deleting} onClick={handleConfirm} className="w-full sm:w-auto">
            Sí, eliminar {noun}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 py-2">
        <p className="text-sm text-foreground">
          ¿Estás seguro de que querés eliminar el {noun} <span className="font-bold">«{item?.name}»</span>?
        </p>
        <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
          Esta acción quita el registro de tu patrimonio y no se puede deshacer.
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
