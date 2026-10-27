"use client";

import { DraftDto, AccountDto } from "@/domain/models/types";
import { Check, X, Sparkles } from "lucide-react";

interface DraftsInboxProps {
  drafts: DraftDto[];
  accounts: AccountDto[];
  onConfirmDraft: (draft: DraftDto, selectedAccountId: string) => void;
  onDiscardDraft: (draftId: string) => void;
  onConfirmAll?: () => void;
}

export function DraftsInbox({
  drafts,
  accounts,
  onConfirmDraft,
  onDiscardDraft,
  onConfirmAll,
}: DraftsInboxProps) {
  if (drafts.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Bandeja al día (Inbox Zero)</h3>
        <p className="text-xs text-slate-400 mt-0.5">
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

  const getAccountName = (draft: DraftDto): string => {
    const accId = resolveAccountId(draft);
    const acc = accounts.find((a) => a.id === accId);
    return acc ? acc.name : draft.source;
  };

  const handleConfirmAll = () => {
    if (onConfirmAll) {
      onConfirmAll();
    } else {
      drafts.forEach((d) => onConfirmDraft(d, resolveAccountId(d)));
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Borradores Detectados ({drafts.length})
          </h2>
        </div>
        <button
          onClick={handleConfirmAll}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
        >
          Aprobar Todo 1-Tap
        </button>
      </div>

      {/* Drafts List */}
      <div className="space-y-2.5">
        {drafts.slice(0, 4).map((draft) => {
          const isIncome = draft.direction === "Income";
          const accountName = getAccountName(draft);
          const formattedAmount = `${isIncome ? "+" : "-"}${draft.currency === "BOB" ? "Bs " : ""}${draft.amount.toFixed(2)}${draft.currency !== "BOB" ? ` ${draft.currency}` : ""}`;

          return (
            <div
              key={draft.id}
              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200 transition flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {draft.reference || "Movimiento Detectado"}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {accountName} · {draft.source}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-extrabold font-mono ${
                    isIncome ? "text-emerald-600" : "text-slate-900"
                  }`}
                >
                  {formattedAmount}
                </span>

                <div className="flex items-center gap-1">
                  {/* Discard button on hover */}
                  <button
                    onClick={() => onDiscardDraft(draft.id)}
                    title="Descartar borrador"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* 1-Tap Approve Button */}
                  <button
                    onClick={() => onConfirmDraft(draft, resolveAccountId(draft))}
                    title="Confirmar en 1-Tap"
                    className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center transition shadow-xs"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
