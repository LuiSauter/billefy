"use client";

import React, { useState } from "react";
import { AccountDto } from "../domain/ledger.types";
import { Button } from "@/shared/ui/button";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";

interface DeleteAccountConfirmationProps {
  /** The account pending deletion; `null` keeps the confirmation closed. */
  account: AccountDto | null;
  /**
   * "drawer": standalone confirmation drawer (account list and detail view).
   * "inline": compact panel embedded in another drawer (edit-account modal).
   */
  presentation?: "drawer" | "inline";
  /** Performs the deletion. The confirmation closes (onClose) once it resolves. */
  onConfirm: (accountId: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Single "delete ledger account" confirmation shared by AccountsMainView,
 * AccountDetailView and EditAccountModal. Owns the `deleting` state and the
 * confirm/cancel behavior; only the presentation (and its copy) differs.
 */
export function DeleteAccountConfirmation({
  account,
  presentation = "drawer",
  onConfirm,
  onClose,
}: DeleteAccountConfirmationProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!account) return;
    setDeleting(true);
    try {
      await onConfirm(account.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  if (presentation === "inline") {
    if (!account) return null;
    return (
      <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30">
        <span className="text-xs font-bold text-destructive">
          ¿Confirmás eliminar la cuenta «{account.name}»?
        </span>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Si tiene transacciones registradas, será archivada para conservar tu historial contable. Si no tiene movimientos, se eliminará permanentemente.
        </p>
        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="ghost" size="sm" disabled={deleting} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" size="sm" loading={deleting} onClick={handleConfirm}>
            Sí, eliminar cuenta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveDrawer
      open={!!account}
      onOpenChange={(open) => !open && onClose()}
      title="Eliminar cuenta"
      description="Confirmación de baja de cuenta"
      size="sm"
      footer={
        <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={deleting}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={deleting}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            Sí, eliminar cuenta
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 py-2">
        <p className="text-sm text-foreground">
          ¿Estás seguro de que querés eliminar la cuenta{" "}
          <span className="font-bold text-foreground">«{account?.name}»</span>?
        </p>
        <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Aviso contable:</span> Si
          la cuenta tiene transacciones registradas, será archivada para mantener
          la integridad de tu balance e historial financiero. Si no tiene
          movimientos, se eliminará permanentemente.
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
