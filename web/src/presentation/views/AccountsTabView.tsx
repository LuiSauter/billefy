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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-[900] text-[#0F172A] tracking-tight">
            Mis Cuentas & Billeteras
          </h1>
          <p className="text-[11px] font-[500] text-[#64748B] mt-0.5">
            Conciliación bancaria y saldos en vivo multimoneda
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCsvModal}
            className="h-[38px] px-3.5 rounded-[10px] border border-[#E2E8F0] bg-white text-[12px] font-[600] text-[#0F172A] hover:bg-slate-50 transition"
          >
            📄 Importar Extracto CSV
          </button>
          <button
            onClick={onOpenCreateAccountModal}
            className="h-[38px] px-4 rounded-[10px] bg-[#2563EB] hover:bg-blue-700 text-white text-[12px] font-[700] transition shadow-sm"
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
