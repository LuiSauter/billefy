"use client";

import React, { useState } from "react";
import { X, Check, Calendar } from "lucide-react";
import { RecurringItem } from "@/presentation/components/recurring/RecurringPaymentsView";

interface ReschedulePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RecurringItem | null;
  onConfirmPay: (item: RecurringItem) => void;
  onSaveNewDate: (item: RecurringItem, newDate: string) => void;
}

export function ReschedulePaymentModal({
  isOpen,
  onClose,
  item,
  onConfirmPay,
  onSaveNewDate,
}: ReschedulePaymentModalProps) {
  const [selectedOption, setSelectedOption] = useState<"+3d" | "today" | "+1w" | "custom">("+3d");

  if (!isOpen || !item) return null;

  const handlePay = () => {
    onConfirmPay(item);
    onClose();
  };

  const handleSaveDate = () => {
    const newDateStr = selectedOption === "+3d" ? "18 de Mayo" : selectedOption === "+1w" ? "22 de Mayo" : "Hoy";
    onSaveNewDate(item, newDateStr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Vencimiento de Pago Programado
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Info Card (OpenPencil 10) */}
        <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-blue-900">
              {item.name} ({item.category})
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Vence en {item.daysRemaining} días
            </span>
          </div>

          <div className="text-3xl font-extrabold text-slate-900 font-mono mb-2">
            {item.currency === "BOB" ? "Bs. " : ""}{item.amount.toFixed(2)}{item.currency !== "BOB" ? ` ${item.currency}` : ""}
          </div>

          <p className="text-xs text-slate-600 font-medium">
            Cuenta debitable: {item.account} · Saldo disponible: Bs. 18,400.00 (Suficiente ✓)
          </p>
        </div>

        {/* Bottom Reschedule Card */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 mb-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Modificar Fecha de Vencimiento / Postergar Pago</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSelectedOption("today")}
              className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                selectedOption === "today"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Pagar Hoy
            </button>

            <button
              type="button"
              onClick={() => setSelectedOption("+3d")}
              className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                selectedOption === "+3d"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              +3 Días (18 May)
            </button>

            <button
              type="button"
              onClick={() => setSelectedOption("+1w")}
              className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                selectedOption === "+1w"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              +1 Sem (22 May)
            </button>

            <button
              type="button"
              onClick={() => setSelectedOption("custom")}
              className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                selectedOption === "custom"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Personalizado
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-tight">
            Al reprogramar, el bot de WhatsApp y las notificaciones push actualizarán el recordatorio sin penalidad.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Action 1: Pagar 1-Clic (Emerald) */}
          <button
            type="button"
            onClick={handlePay}
            className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Confirmar Pago {item.currency === "BOB" ? "Bs. " : ""}{item.amount.toFixed(2)} (1-Clic)</span>
          </button>

          {/* Action 2: Guardar Nueva Fecha */}
          <button
            type="button"
            onClick={handleSaveDate}
            className="w-full py-3 px-6 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 font-bold text-sm transition"
          >
            Guardar Nueva Fecha ({selectedOption === "+3d" ? "18 de Mayo" : selectedOption === "+1w" ? "22 de Mayo" : "Hoy"})
          </button>
        </div>
      </div>
    </div>
  );
}
