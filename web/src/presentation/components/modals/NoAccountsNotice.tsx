"use client";

import React from "react";
import { AlertCircle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoAccountsNoticeProps {
  /** Explanatory text, specific to the flow that needs accounts. */
  description: string;
  title?: string;
  /** Label of the primary action. */
  ctaLabel?: string;
  /** When omitted, the primary action is not rendered. */
  onOpenCreateAccount?: () => void;
}

/** Shared empty state for flows that need at least one account. */
export function NoAccountsNotice({
  description,
  title = "No tenés cuentas registradas",
  ctaLabel = "Crear mi primera cuenta",
  onOpenCreateAccount,
}: NoAccountsNoticeProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
      <div
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full border border-warning/30 bg-warning/10 text-warning"
      >
        <AlertCircle className="size-7" />
      </div>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {onOpenCreateAccount && (
        <Button
          type="button"
          size="lg"
          className="mt-2 w-full sm:w-auto"
          onClick={onOpenCreateAccount}
        >
          <PlusCircle />
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
