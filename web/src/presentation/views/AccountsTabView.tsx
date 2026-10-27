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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Mis Cuentas & Billeteras
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Conciliación bancaria y saldos en vivo multimoneda
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCsvModal}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            📄 Importar Extracto CSV
          </button>
          <button
            onClick={onOpenCreateAccountModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-md shadow-blue-500/25"
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
