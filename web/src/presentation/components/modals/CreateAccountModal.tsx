import React, { useState } from "react";
import { AccountType, CreateAccountRequest } from "@/domain/models/types";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: CreateAccountRequest) => Promise<void>;
}

export function CreateAccountModal({ isOpen, onClose, onSubmit }: CreateAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("Bank");
  const [currency, setCurrency] = useState("BOB");
  const [initialBalance, setInitialBalance] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        currency,
        initialBalance: initialBalance.trim() ? parseFloat(initialBalance.trim()) : 0,
      });
      setName("");
      setInitialBalance("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="w-full max-w-md shadow-2xl bg-white border border-[#E2E8F0] rounded-[20px] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-[800] text-[#0F172A] tracking-tight">
            Crear Nueva Cuenta
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#64748B] hover:bg-slate-100 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-[700] text-[#475569]">Nombre de la cuenta</label>
            <input
              id="accountName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Banco Unión, Billetera USDT, Efectivo"
              className="h-[42px] px-3.5 rounded-[10px] border border-[#E2E8F0] text-[13px] font-[600] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-[700] text-[#475569]">Tipo de cuenta</label>
            <select
              id="accountType"
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="h-[42px] px-3.5 rounded-[10px] border border-[#E2E8F0] text-[13px] font-[600] text-[#0F172A] bg-white focus:outline-none focus:border-[#2563EB]"
            >
              <option value="Bank">Banco</option>
              <option value="Wallet">Billetera Digital</option>
              <option value="Cash">Efectivo</option>
              <option value="Exchange">Exchange (Crypto)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-[700] text-[#475569]">Moneda</label>
            <select
              id="accountCurrency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-[42px] px-3.5 rounded-[10px] border border-[#E2E8F0] text-[13px] font-[600] text-[#0F172A] bg-white focus:outline-none focus:border-[#2563EB]"
            >
              <option value="BOB">Bolivianos (BOB)</option>
              <option value="USD">Dólares (USD)</option>
              <option value="USDT">Tether (USDT)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-[700] text-[#475569]">Saldo Inicial</label>
            <input
              id="initialBalance"
              type="number"
              step="any"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0.00"
              className="h-[42px] px-3.5 rounded-[10px] border border-[#E2E8F0] text-[13px] font-[800] font-mono text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[40px] px-4 rounded-[10px] border border-[#E2E8F0] text-[12px] font-[600] text-[#475569] hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="h-[40px] px-5 rounded-[10px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[12px] font-[700] transition disabled:opacity-50"
            >
              {submitting ? "Creando..." : "Crear Cuenta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
