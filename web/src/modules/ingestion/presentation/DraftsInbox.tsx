"use client";

import React from "react";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { DraftDto } from "@/modules/ingestion/domain/ingestion.types";
import { Check, Sparkles } from "lucide-react";
import { Amount } from "@/shared/ui/amount";

interface DraftsInboxProps {
  drafts: DraftDto[];
  accounts: AccountDto[];
  onConfirmDraft: (draft: DraftDto, selectedAccountId: string) => void;
  onDiscardDraft?: (draftId: string) => void;
  onConfirmAll?: () => void;
}

export function DraftsInbox({
  drafts,
  accounts,
  onConfirmDraft,
  onConfirmAll,
}: DraftsInboxProps) {
  if (drafts.length === 0) {
    return (
      <div className="p-[18px] rounded-[16px] bg-card border border-border shadow-2xs flex flex-col items-center justify-center text-center py-8">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
          <Sparkles className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Bandeja al día (Inbox Zero)</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Todas las notificaciones y capturas bancarias fueron confirmadas.
        </p>
      </div>
    );
  }

  const resolveAccountId = (draft: DraftDto): string => {
    return (
      draft.suggestedAccountId ||
      accounts.find((a) => a.currency === draft.currency)?.id ||
      accounts[0]?.id ||
      ""
    );
  };

  const getAccountLabel = (draft: DraftDto): string => {
    const accId = resolveAccountId(draft);
    const acc = accounts.find((a) => a.id === accId);
    const channel = acc?.name || draft.source || "Canal Digital";
    const ref = draft.reference || "Gasto detectado";
    return `${ref} • ${channel}`;
  };

  const handleConfirmAll = () => {
    if (onConfirmAll) {
      onConfirmAll();
    } else {
      drafts.forEach((d) => onConfirmDraft(d, resolveAccountId(d)));
    }
  };

  return (
    <div className="p-[18px] rounded-[16px] bg-card border border-border flex flex-col gap-3 shadow-2xs">
      {/* Header (OpenPencil InH) */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-foreground tracking-tight">
          Borradores Detectados ({drafts.length})
        </h2>
        <button
          onClick={handleConfirmAll}
          className="text-sm font-bold text-indigo-400 hover:underline transition"
        >
          Aprobar Todo 1-Tap
        </button>
      </div>

      {/* Rows (OpenPencil ItRow_0, ItRow_1, ItRow_2) */}
      <div className="flex flex-col gap-2">
        {drafts.slice(0, 3).map((draft) => {
          const isIncome = draft.direction === "Income";

          return (
            <div
              key={draft.id}
              className="h-[38px] px-[8px] rounded-[8px] bg-background border border-border/60 flex items-center justify-between transition hover:bg-muted/60"
            >
              {/* Left Label */}
              <div className="text-sm font-semibold text-foreground truncate pr-2">
                {getAccountLabel(draft)}
              </div>

              {/* Right: Amount + Ok button */}
              <div className="flex items-center gap-2 shrink-0">
                <Amount
                  value={isIncome ? draft.amount : draft.amount.negated()}
                  currency={draft.currency}
                  tone="neutral"
                  size="sm"
                />

                <button
                  onClick={() => onConfirmDraft(draft, resolveAccountId(draft))}
                  title="Aprobar en 1-Tap"
                  className="w-[22px] h-[22px] rounded-[4px] bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center transition shadow-2xs"
                >
                  <Check className="w-[12px] h-[12px] stroke-[2.5]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
