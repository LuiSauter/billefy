"use client";

import { DraftDto, AccountDto } from "@/domain/models/types";
import { X, Check } from "lucide-react";

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
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Borradores Detectados ({drafts.length})
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Click Approve All Button (Indigo) */}
        {drafts.length > 0 && (
          <button
            onClick={() => {
              onConfirmAll();
              onClose();
            }}
            className="w-full py-3.5 px-4 mb-5 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.99] text-white font-bold text-sm transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Aprobar los {drafts.length} en 1-Clic</span>
          </button>
        )}

        {/* Drafts List */}
        <div className="overflow-y-auto space-y-3 flex-1 pr-1">
          {drafts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No tenés borradores pendientes de confirmación.
            </div>
          ) : (
            drafts.map((draft) => {
              const isIncome = draft.direction === "Income";
              const accountName = getAccountName(draft);
              const formattedAmount = `${isIncome ? "+" : "-"}${draft.currency === "BOB" ? "Bs " : ""}${draft.amount.toFixed(2)}${draft.currency !== "BOB" ? ` ${draft.currency}` : ""}`;

              return (
                <div
                  key={draft.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {draft.reference || "Movimiento Detectado"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {accountName} · {draft.source}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-sm font-extrabold font-mono ${
                        isIncome ? "text-emerald-600" : "text-slate-900"
                      }`}
                    >
                      {formattedAmount}
                    </span>

                    <button
                      onClick={() => onConfirmDraft(draft, resolveAccountId(draft))}
                      title="Aprobar borrador en 1-Tap"
                      className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center transition shadow-xs"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
