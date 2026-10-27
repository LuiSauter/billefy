"use client";

import { AccountDto } from "@/domain/models/types";
import { Plus, Landmark, Wallet2, ArrowDownUp } from "lucide-react";

interface AccountsListProps {
  accounts: AccountDto[];
  loading: boolean;
  onOpenCreateAccountModal: () => void;
  onOpenReconcileModal: (account: AccountDto) => void;
}

export function AccountsList({
  accounts,
  loading,
  onOpenCreateAccountModal,
  onOpenReconcileModal,
}: AccountsListProps) {
  const getSublabel = (type: string, currency: string) => {
    if (type === "Exchange" || currency === "USDT") return "P2P Activo";
    if (type === "Cash") return "Físico";
    if (type === "Investment") return "Rendimiento";
    return "Billetera";
  };

  const getAccountIcon = (type: string, currency: string) => {
    if (type === "Exchange" || currency === "USDT") return <ArrowDownUp className="w-3.5 h-3.5 text-amber-500" />;
    if (type === "Cash") return <Wallet2 className="w-3.5 h-3.5 text-emerald-500" />;
    return <Landmark className="w-3.5 h-3.5 text-blue-500" />;
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Cuentas & Billeteras Conectadas
        </h2>
        <button
          onClick={onOpenCreateAccountModal}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Vincular Cuenta</span>
        </button>
      </div>

      {loading && accounts.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
          Cargando cuentas desde el servidor...
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-8 text-center text-slate-400 space-y-2">
          <p className="text-sm font-medium">No tenés cuentas vinculadas.</p>
          <button
            onClick={onOpenCreateAccountModal}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            + Crear tu primera cuenta bancaria o cripto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-500">
                  {getSublabel(acc.type, acc.currency)}
                </span>
                <div className="flex items-center gap-1.5">
                  {getAccountIcon(acc.type, acc.currency)}
                  <button
                    onClick={() => onOpenReconcileModal(acc)}
                    title="Conciliar Saldo Real"
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 hover:text-blue-600 transition underline"
                  >
                    Conciliar
                  </button>
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {acc.name}
                </div>
                <div className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                  {acc.currency === "BOB" ? "Bs " : ""}{acc.balance.toFixed(2)}{acc.currency !== "BOB" ? ` ${acc.currency}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
