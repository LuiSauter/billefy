"use client";

import React, { useState } from "react";
import { X, Check } from "lucide-react";
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

  const formattedAmount = item.currency === "BOB" ? `Bs. ${item.amount.toFixed(2)}` : `${item.amount} ${item.currency}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-[587px] bg-white rounded-[24px] p-[24px_28px_28px_28px] shadow-2xl border border-[#E2E8F0] relative max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        {/* Header (OpenPencil MPWHead) */}
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-[900] text-[#0F172A] tracking-tight">
            Vencimiento de Pago Programado
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#64748B] hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Info Card (OpenPencil SWCard) */}
        <div className="p-4 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-[800] text-[#1D4ED8]">
              {item.name} ({item.category})
            </span>
            <span className="text-[9px] font-[800] text-[#B45309] bg-amber-100 rounded px-1.5 py-0.5">
              Vence en {item.daysRemaining} días
            </span>
          </div>

          <div className="text-[32px] font-[900] text-[#0F172A] font-mono leading-none my-1">
            {formattedAmount}
          </div>

          <p className="text-[11px] font-[500] text-[#475569]">
            Cuenta debitable: {item.account} • Saldo disponible: Bs. 18,400.00 (Suficiente ✓)
          </p>
        </div>

        {/* Reschedule Card (OpenPencil RepWeb) */}
        <div className="p-4 rounded-[16px] bg-white border border-[#E2E8F0] flex flex-col gap-2.5">
          <span className="text-[12px] font-[700] text-[#0F172A]">
            📅 Modificar Fecha de Vencimiento / Postergar Pago
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSelectedOption("today")}
              className={`h-[32px] px-2 rounded-[8px] text-[11px] font-[600] border transition text-center ${
                selectedOption === "today"
                  ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] font-[800]"
                  : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50"
              }`}
            >
              Pagar Hoy
            </button>

            <button
              type="button"
              onClick={() => setSelectedOption("+3d")}
              className={`h-[32px] px-2 rounded-[8px] text-[11px] font-[800] border transition text-center ${
                selectedOption === "+3d"
                  ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] shadow-xs"
                  : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50"
              }`}
            >
              +3 Días (18 May)
            </button>

            <button
              type="button"
              onClick={() => setSelectedOption("+1w")}
              className={`h-[32px] px-2 rounded-[8px] text-[11px] font-[600] border transition text-center ${
                selectedOption === "+1w"
                  ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] font-[800]"
                  : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50"
              }`}
            >
              +1 Semana (22 May)
            </button>

            <button
              type="button"
              onClick={() => setSelectedOption("custom")}
              className={`h-[32px] px-2 rounded-[8px] text-[11px] font-[600] border transition text-center ${
                selectedOption === "custom"
                  ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] font-[800]"
                  : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50"
              }`}
            >
              Calendario Personalizado
            </button>
          </div>

          <p className="text-[10px] font-[500] text-[#64748B]">
            Al reprogramar, el bot de WhatsApp y las notificaciones push actualizarán el recordatorio sin penalidad.
          </p>
        </div>

        {/* Buttons (OpenPencil BtnConfPW & BtnPostponeW) */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handlePay}
            className="w-full h-[48px] rounded-[12px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[14px] font-[800] transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Check className="w-[16px] h-[16px] stroke-[2.5]" />
            <span>Confirmar Pago {formattedAmount} (1-Clic)</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDate}
            className="w-full h-[44px] rounded-[12px] text-[#2563EB] hover:bg-blue-50 text-[12px] font-[700] transition flex items-center justify-center"
          >
            Guardar Nueva Fecha (18 de Mayo)
          </button>
        </div>
      </div>
    </div>
  );
}
