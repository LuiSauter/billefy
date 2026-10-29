"use client";

import React from "react";
import { AccountDto } from "@/domain/models/types";
import { AccountsList } from "@/presentation/components/accounts/AccountsList";

interface AccountsTabViewProps {
  accounts: AccountDto[];
  loading: boolean;
  onOpenCreateAccountModal: () => void;
  onOpenCsvModal: () => void;
  onOpenReconcileModal: (account: AccountDto) => void;
}

export function AccountsTabView({
  accounts,
  loading,
  onOpenCreateAccountModal,
  onOpenCsvModal,
  onOpenReconcileModal,
}: AccountsTabViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-black text-foreground tracking-tight">
            Mis Cuentas & Billeteras
          </h1>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            Conciliación bancaria y saldos en vivo multimoneda
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenCsvModal}
            className="h-[38px] px-3.5 rounded-[10px] border border-border bg-white text-sm font-semibold text-foreground hover:bg-slate-50 transition"
          >
            📄 Importar CSV
          </button>
          <button
            onClick={onOpenCreateAccountModal}
            className="h-[38px] px-4 rounded-[10px] bg-primary hover:bg-blue-700 text-white text-sm font-bold transition shadow-2xs"
          >
            + Nueva Cuenta
          </button>
        </div>
      </div>

      <AccountsList
        accounts={accounts}
        loading={loading}
        onOpenCreateAccountModal={onOpenCreateAccountModal}
        onOpenReconcileModal={onOpenReconcileModal}
      />
    </div>
  );
}
