"use client";

import { useState } from "react";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { DraftDto } from "@/modules/ingestion/domain/ingestion.types";
import { CheckCheck, Check, Inbox } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { formatSignedAmount } from "@/shared/lib/format";

interface DraftsDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: DraftDto[];
  accounts: AccountDto[];
  onConfirmDraft: (draft: DraftDto, selectedAccountId: string) => void;
  onConfirmAll: () => void;
}

export function DraftsDrawerModal({
  isOpen,
  onClose,
  drafts,
  accounts,
  onConfirmDraft,
  onConfirmAll,
}: DraftsDrawerModalProps) {
  const [approvingAll, setApprovingAll] = useState(false);

  const resolveAccountId = (draft: DraftDto): string => {
    return (
      draft.suggestedAccountId ||
      accounts.find((a) => a.currency === draft.currency)?.id ||
      accounts[0]?.id ||
      ""
    );
  };

  const getAccountName = (draft: DraftDto): string => {
    const accId = resolveAccountId(draft);
    const acc = accounts.find((a) => a.id === accId);
    return acc ? acc.name : draft.source;
  };

  const handleConfirmAll = async () => {
    setApprovingAll(true);
    try {
      // onConfirmAll may be async at runtime even though it is typed as void.
      await Promise.resolve(onConfirmAll());
      onClose();
    } finally {
      setApprovingAll(false);
    }
  };

  const hasDrafts = drafts.length > 0;

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={`Borradores detectados (${drafts.length})`}
      description="Revisalos y aprobalos para que pasen al libro mayor."
      footer={
        hasDrafts ? (
          <Button
            type="button"
            size="lg"
            loading={approvingAll}
            onClick={handleConfirmAll}
            className="w-full md:flex-1"
          >
            {!approvingAll && <CheckCheck />}
            {approvingAll ? "Aprobando..." : `Aprobar los ${drafts.length} en 1-Clic`}
          </Button>
        ) : undefined
      }
    >
      {!hasDrafts ? (
        <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
          <div
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <Inbox className="size-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">Sin borradores pendientes</h3>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            No tenés borradores pendientes de confirmación. Cuando detectemos nuevos movimientos, van a aparecer acá.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {drafts.map((draft) => {
            const isIncome = draft.direction === "Income";
            const accountName = getAccountName(draft);

            return (
              <li
                key={draft.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">
                    {draft.reference || "Movimiento Detectado"}
                  </div>
                  <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                    {accountName} • {draft.source}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "text-sm font-extrabold tabular-nums",
                      isIncome ? "text-success" : "text-destructive"
                    )}
                  >
                    {formatSignedAmount(draft.amount, draft.currency, draft.direction)}
                  </span>
                  <Button
                    type="button"
                    variant="success"
                    size="icon-lg"
                    onClick={() => onConfirmDraft(draft, resolveAccountId(draft))}
                    aria-label={`Aprobar borrador ${draft.reference || "detectado"}`}
                    title="Aprobar borrador en 1-Tap"
                  >
                    <Check className="size-5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ResponsiveDrawer>
  );
}
