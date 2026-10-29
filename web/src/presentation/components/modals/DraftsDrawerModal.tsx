"use client";

import { DraftDto, AccountDto } from "@/domain/models/types";
import { X, Check, CheckCheck } from "lucide-react";

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
      <div className="w-full max-w-[460px] bg-white rounded-[20px] p-[24px_20px] shadow-2xl border border-border relative flex flex-col gap-4 max-h-[90vh]">
        {/* Header (OpenPencil DH) */}
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold text-foreground tracking-tight">
            Borradores Detectados ({drafts.length})
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Click Approve All Button (OpenPencil BtnAppAll) */}
        {drafts.length > 0 && (
          <button
            onClick={() => {
              onConfirmAll();
              onClose();
            }}
            className="w-full h-[46px] rounded-[12px] bg-primary hover:bg-blue-700 active:scale-[0.99] text-white text-[15px] font-extrabold transition flex items-center justify-center gap-2 shadow-xs"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Aprobar los {drafts.length} en 1-Clic</span>
          </button>
        )}

        {/* Drafts List (OpenPencil DICard_0, 1, 2) */}
        <div className="overflow-y-auto flex flex-col gap-2.5 pr-0.5">
          {drafts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
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
                  className="p-3 rounded-[12px] border border-border bg-background flex items-center justify-between gap-3 hover:bg-slate-100/70 transition"
                >
                  {/* Left (DIL) */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground truncate">
                      {draft.reference || "Movimiento Detectado"}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground truncate mt-0.5">
                      {accountName} • {draft.source}
                    </div>
                  </div>

                  {/* Right (DIR) */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-sm font-extrabold font-mono ${
                        isIncome ? "text-emerald-600" : "text-foreground"
                      }`}
                    >
                      {formattedAmount}
                    </span>

                    <button
                      onClick={() => onConfirmDraft(draft, resolveAccountId(draft))}
                      title="Aprobar borrador en 1-Tap"
                      className="w-[28px] h-[28px] rounded-[6px] bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center transition shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
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
