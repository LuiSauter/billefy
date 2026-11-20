"use client";

import React, { useState } from "react";
import { Investment } from "../../domain/investment.types";
import { Button } from "@/shared/ui/button";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Amount } from "@/shared/ui/amount";

interface ArchiveInvestmentModalProps {
  investment: Investment | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  /** ISO code used to display the current value. */
  currency?: string;
}

export function ArchiveInvestmentModal({
  investment,
  isOpen,
  onClose,
  onDelete,
  currency = "USD",
}: ArchiveInvestmentModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!investment) return null;

  const handleArchive = async () => {
    setSubmitting(true);
    try {
      await onDelete(investment.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
      title="Archivar inversión"
      description={investment.name}
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleArchive} loading={submitting}>
            Archivar
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
        <span className="min-w-0 truncate text-sm font-semibold">{investment.name}</span>
        <Amount value={investment.currentValue} currency={currency} size="sm" />
      </div>
    </ResponsiveDrawer>
  );
}
