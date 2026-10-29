import React, { useState } from "react";
import { AccountDto, RegisterTransactionRequest, TransactionDirection } from "@/domain/models/types";
import { AlertCircle, PlusCircle } from "lucide-react";

interface RegisterTransactionModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  defaultAccountId: string;
  onClose: () => void;
  onSubmit: (req: RegisterTransactionRequest) => Promise<void>;
  onOpenCreateAccount?: () => void;
}

export function RegisterTransactionModal({
  isOpen,
  accounts,
  defaultAccountId,
  onClose,
  onSubmit,
  onOpenCreateAccount,
}: RegisterTransactionModalProps) {
  const [accountId, setAccountId] = useState(defaultAccountId || (accounts[0]?.id ?? ""));
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<TransactionDirection>("Expense");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Blocker if no accounts exist
  if (accounts.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
        <div className="w-full max-w-md shadow-2xl bg-white border border-border rounded-[20px] p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-[17px] font-extrabold text-foreground tracking-tight">
              Registrar Movimiento
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-muted-foreground hover:bg-slate-100 flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>

          <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-[16px] font-extrabold text-foreground">
              No tenés cuentas registradas
            </h3>
            <p className="text-sm text-muted-foreground max-w-[320px] leading-relaxed">
              Para registrar ingresos o gastos en el libro mayor inmutable, primero debés registrar tu primera cuenta.
            </p>
            {onOpenCreateAccount && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateAccount();
                }}
                className="mt-2 h-[42px] px-6 rounded-[12px] bg-primary hover:bg-blue-700 text-white text-sm font-extrabold transition flex items-center gap-2 shadow-2xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Crear mi primera cuenta</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        accountId: accountId || defaultAccountId || accounts[0]?.id || "",
        amount,
        direction,
        description: description.trim() || undefined,
      });
      setAmount("");
      setDescription("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="w-full max-w-md shadow-2xl bg-white border border-border rounded-[20px] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold text-foreground tracking-tight">
            Registrar Movimiento en Servidor
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-muted-foreground hover:bg-slate-100 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">Cuenta</label>
            <select
              id="txnAccount"
              value={accountId || defaultAccountId || accounts[0]?.id || ""}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-[42px] px-3.5 rounded-[10px] border border-border text-sm font-semibold text-foreground bg-white focus:outline-hidden focus:border-primary"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">Tipo de Movimiento</label>
            <select
              id="txnDirection"
              value={direction}
              onChange={(e) => setDirection(e.target.value as TransactionDirection)}
              className="h-[42px] px-3.5 rounded-[10px] border border-border text-sm font-semibold text-foreground bg-white focus:outline-hidden focus:border-primary"
            >
              <option value="Expense">Gasto (-)</option>
              <option value="Income">Ingreso (+)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">Monto</label>
            <input
              id="txnAmount"
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-[42px] px-3.5 rounded-[10px] border border-border text-sm font-extrabold font-mono text-foreground focus:outline-hidden focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">Descripción</label>
            <input
              id="txnDesc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Almuerzo, Taxi, Sueldo"
              className="h-[42px] px-3.5 rounded-[10px] border border-border text-sm font-semibold text-foreground focus:outline-hidden focus:border-primary"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[40px] px-4 rounded-[10px] border border-border text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !amount || parseFloat(amount) <= 0}
              className="h-[40px] px-5 rounded-[10px] bg-primary hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-bold transition disabled:opacity-50"
            >
              {submitting ? "Guardando..." : "Confirmar Movimiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
