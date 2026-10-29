"use client";

import { AccountDto } from "@/domain/models/types";

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
  const getSublabel = (acc: AccountDto) => {
    if (acc.currency === "USDT" || acc.type === "Exchange") return "P2P Activo";
    if (acc.type === "Cash") return "Efectivo";
    if (acc.type === "Bank") return "Banco";
    if (acc.type === "Wallet") return "Billetera";
    return acc.currency;
  };

  const formatBalance = (acc: AccountDto) => {
    const balNum = acc.balance.toNumber();
    if (acc.currency === "USDT") {
      return `${balNum.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDT`;
    }
    if (acc.currency === "BOB") {
      return `Bs ${balNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${balNum.toFixed(2)} ${acc.currency}`;
  };

  return (
    <div className="p-[18px] rounded-[16px] bg-white border border-[#E2E8F0] flex flex-col gap-3.5 shadow-xs">
      {/* Header (OpenPencil AH) */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-[800] text-[#0F172A] tracking-tight">
          Cuentas & Billeteras Conectadas
        </h2>
        <button
          onClick={onOpenCreateAccountModal}
          className="text-[12px] font-[700] text-[#2563EB] hover:underline transition"
        >
          + Vincular Cuenta
        </button>
      </div>

      {loading && accounts.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
          Cargando cuentas...
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-6 text-center text-slate-400 space-y-1">
          <p className="text-xs font-medium">No tenés cuentas vinculadas.</p>
          <button
            onClick={onOpenCreateAccountModal}
            className="text-xs text-[#2563EB] font-bold hover:underline"
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
              className="p-3 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1 cursor-pointer hover:border-slate-300 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-[700] text-[#64748B]">
                  {getSublabel(acc)}
                </span>
                <span className="text-[9px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition">
                  Conciliar
                </span>
              </div>
              <div className="text-[13px] font-[600] text-[#0F172A] truncate">
                {acc.name}
              </div>
              <div className="text-[13px] font-[800] text-[#0F172A] font-mono">
                {formatBalance(acc)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
