"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { EditAccountModal } from "./EditAccountModal";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import {
  getAccountTypeLabel,
  resolveAccountVisualMeta,
} from "@/modules/ledger/domain/account-meta";
import { CategoryIconBadge } from "./CategoryIcon";
import { Amount } from "@/shared/ui/amount";

interface AccountsListProps {
  accounts: AccountDto[];
  loading: boolean;
  hideHeader?: boolean;
  onOpenCreateAccountModal: () => void;
  onOpenReconcileModal: (account: AccountDto) => void;
  onUpdateAccount?: (
    accountId: string,
    data: { name: string; iconKey: string; colorKey: string }
  ) => Promise<void>;
}

export function AccountsList({
  accounts,
  loading,
  hideHeader = false,
  onOpenCreateAccountModal,
  onOpenReconcileModal,
  onUpdateAccount,
}: AccountsListProps) {
  const [editing, setEditing] = useState<AccountDto | null>(null);
  const getSublabel = (acc: AccountDto) => getAccountTypeLabel(acc.type);

  return (
    <div className="p-[18px] rounded-[16px] bg-card border border-border flex flex-col gap-3.5 shadow-2xs">
      {/* Header (OpenPencil AH) */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-foreground tracking-tight">
            Cuentas & Billeteras Conectadas
          </h2>
          <button
            onClick={onOpenCreateAccountModal}
            className="text-sm font-bold text-primary hover:underline transition"
          >
            + Vincular Cuenta
          </button>
        </div>
      )}

      {loading && accounts.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
          Cargando cuentas...
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground space-y-1">
          <p className="text-xs font-medium">No tenés cuentas vinculadas.</p>
          <button
            onClick={onOpenCreateAccountModal}
            className="text-xs text-primary font-bold hover:underline"
          >
            + Vincular tu primera cuenta
          </button>
        </div>
      ) : (
        /* AGrid: responsive 4 cards (OpenPencil AGrid) */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => onOpenReconcileModal(acc)}
              title="Click para conciliar saldo real"
              className="p-3 rounded-[12px] bg-background border border-border flex flex-col gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition group"
            >
              <div className="flex items-center justify-between">
                <CategoryIconBadge
                  iconKey={resolveAccountVisualMeta(acc).iconKey}
                  colorKey={resolveAccountVisualMeta(acc).colorKey}
                  size="sm"
                />
                <div className="flex items-center gap-2">
                  {onUpdateAccount && (
                    <button
                      type="button"
                      title="Editar cuenta"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(acc);
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition">
                    Conciliar
                  </span>
                </div>
              </div>
              <div className="text-sm font-semibold text-foreground truncate">
                {acc.name}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground">
                {getSublabel(acc)}
              </div>
              <Amount value={acc.balance} currency={acc.currency} size="sm" />
            </div>
          ))}
        </div>
      )}

      {onUpdateAccount && (
        <EditAccountModal
          account={editing}
          onClose={() => setEditing(null)}
          onSubmit={onUpdateAccount}
        />
      )}
    </div>
  );
}
