"use client";

import React, { useState } from "react";
import { Plus, Calendar } from "lucide-react";

export interface RecurringItem {
  id: string;
  name: string;
  category: string;
  account: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysRemaining: number;
  periodicity: string;
  status: "DueSoon" | "Scheduled";
}

interface RecurringPaymentsViewProps {
  onOpenRescheduleModal: (item: RecurringItem) => void;
  onPay1Click: (item: RecurringItem) => void;
  p2pRate: number;
}

export function RecurringPaymentsView({
  onOpenRescheduleModal,
  onPay1Click,
  p2pRate,
}: RecurringPaymentsViewProps) {
  // Empty array by default - no mock or fabricated items
  const [payments] = useState<RecurringItem[]>([]);

  const totalFixedExpensesBob = payments.reduce((acc, p) => {
    return p.currency === "BOB" ? acc + p.amount : acc + p.amount * p2pRate;
  }, 0);

  return (
    <div className="w-full max-w-[920px] p-[24px_28px_32px_28px] rounded-[24px] bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-[18px]">
      {/* Header (OpenPencil RWHead) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-[900] text-[#0F172A] tracking-tight">
            Pagos Programados & Flujo Recurrente
          </h1>
          <p className="text-[11px] font-[500] text-[#64748B] mt-0.5">
            Administración de suscripciones, servicios, alquileres y cobros periódicos en BOB y USDT
          </p>
        </div>

        <button
          onClick={() => {
            alert("Próximamente: Podrás vincular pagos recurrentes a partir de tus transacciones periódicas detectadas.");
          }}
          className="h-[38px] px-4 rounded-[10px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[12px] font-[800] transition flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Programar Nuevo Flujo</span>
        </button>
      </div>

      {/* Dark Slate Summary Card (OpenPencil RWCard) */}
      <div className="p-4 rounded-[16px] bg-[#0F172A] text-white shadow-md grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Col 0: Compromisos Fijos */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Compromisos Fijos Mensuales</span>
          <span className="text-[18px] font-[900] text-white font-mono">
            {totalFixedExpensesBob > 0 ? `-Bs. ${totalFixedExpensesBob.toFixed(2)}` : "Bs. 0.00"}
          </span>
          <span className="text-[10px] font-[500] text-[#94A3B8]">
            {payments.length} {payments.length === 1 ? "Servicio programado" : "Servicios programados"}
          </span>
        </div>

        {/* Col 1: Vencimientos Próximos */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Por Vencer (&lt; 3 días)</span>
          <span className="text-[18px] font-[900] text-white font-mono">
            {payments.filter((p) => p.daysRemaining <= 3).length}
          </span>
          <span className="text-[10px] font-[500] text-[#F87171]">Alertas activas</span>
        </div>

        {/* Col 2: Estado general */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Conciliación Predictiva</span>
          <span className="text-[18px] font-[900] text-emerald-400 font-mono">Al Día</span>
          <span className="text-[10px] font-[500] text-[#34D399]">Sin pagos vencidos</span>
        </div>
      </div>

      {/* Recurring Items List */}
      <div className="flex flex-col gap-3">
        {payments.length === 0 ? (
          <div className="p-8 rounded-[16px] bg-white border border-[#E2E8F0] text-center text-[#64748B] text-xs space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-700">No tenés pagos programados todavía.</p>
            <p className="text-slate-500 max-w-sm mx-auto">
              Cuando programes suscripciones o servicios, verás aquí sus fechas de vencimiento con alertas predictivas y confirmación en 1-Clic.
            </p>
          </div>
        ) : (
          payments.map((item) => {
            const formattedAmount =
              item.currency === "BOB" ? `Bs. ${item.amount.toFixed(2)}` : `${item.amount} ${item.currency}`;

            return (
              <div
                key={item.id}
                className="p-4 rounded-[16px] bg-white border border-[#E2E8F0] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 transition"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-[800] text-[#0F172A]">{item.name}</span>
                    <span
                      className={`text-[9px] font-[800] px-2 py-0.5 rounded-full ${
                        item.status === "DueSoon"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.status === "DueSoon" ? `Vence en ${item.daysRemaining}d` : item.dueDate}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#64748B]">
                    {item.category} • Cuenta: {item.account} • {item.periodicity}
                  </span>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-[16px] font-[900] font-mono text-[#0F172A]">
                    {formattedAmount}
                  </span>
                  <button
                    onClick={() => onOpenRescheduleModal(item)}
                    className="h-[32px] px-3 rounded-[8px] border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition"
                  >
                    Reprogramar
                  </button>
                  <button
                    onClick={() => onPay1Click(item)}
                    className="h-[32px] px-3 rounded-[8px] bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-2xs"
                  >
                    Pagar 1-Clic
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
