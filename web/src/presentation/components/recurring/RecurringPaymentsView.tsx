"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

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
  const [payments] = useState<RecurringItem[]>([
    {
      id: "rec-1",
      name: "Internet Fibra Tigo",
      category: "Plan Hogar 200 Mbps",
      account: "Banco Unión",
      amount: 280,
      currency: "BOB",
      dueDate: "15 May",
      daysRemaining: 2,
      periodicity: "Mensual",
      status: "DueSoon",
    },
    {
      id: "rec-2",
      name: "Alquiler Departamento",
      category: "Vivienda",
      account: "Banco Unión",
      amount: 3200,
      currency: "BOB",
      dueDate: "20 May",
      daysRemaining: 7,
      periodicity: "Mensual",
      status: "Scheduled",
    },
    {
      id: "rec-3",
      name: "Suscripción iCloud + Spotify",
      category: "Suscripciones Digitales",
      account: "Binance Card",
      amount: 14.99,
      currency: "USDT",
      dueDate: "25 May",
      daysRemaining: 10,
      periodicity: "Mensual",
      status: "Scheduled",
    },
    {
      id: "rec-4",
      name: "Seguro Automotriz Alianza",
      category: "Seguros",
      account: "Banco BCP",
      amount: 1200,
      currency: "BOB",
      dueDate: "10 Ago",
      daysRemaining: 85,
      periodicity: "Anual",
      status: "Scheduled",
    },
  ]);

  return (
    <div className="w-full max-w-[920px] p-[24px_28px_32px_28px] rounded-[24px] bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-[18px]">
      {/* Header (OpenPencil RWHead) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-[900] text-[#0F172A] tracking-tight">
            Pagos Programados & Flujo Recurrente
          </h1>
          <p className="text-[11px] font-[500] text-[#64748B] mt-0.5">
            Administración de suscripciones, servicios, sueldos y cobros periódicos en BOB y USDT
          </p>
        </div>

        <button
          onClick={() => alert("Programar Nuevo Flujo")}
          className="h-[38px] px-4 rounded-[10px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[12px] font-[800] transition flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Programar Nuevo Flujo</span>
        </button>
      </div>

      {/* Dark Slate Summary Card (OpenPencil RWCard) */}
      <div className="p-4 rounded-[16px] bg-[#0F172A] text-white shadow-md grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Col 0: Ingresos Fijos */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Ingresos Fijos Mensuales</span>
          <span className="text-[18px] font-[900] text-white font-mono">+Bs. 18,500.00</span>
          <span className="text-[10px] font-[500] text-[#34D399]">2 Fuentes activas</span>
        </div>

        {/* Col 1: Pagos Fijos */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Pagos & Compromisos Fijos</span>
          <span className="text-[18px] font-[900] text-white font-mono">-Bs. 4,680.00</span>
          <span className="text-[10px] font-[500] text-[#F87171]">4 Servicios programados</span>
        </div>

        {/* Col 2: Margen Libre */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Margen Recurrente Libre</span>
          <span className="text-[18px] font-[900] text-white font-mono">+Bs. 13,820.00</span>
          <span className="text-[10px] font-[500] text-[#60A5FA]">74.7% de liquidez disponible</span>
        </div>

        {/* Col 3: Próximo Vencimiento */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-[600] text-[#94A3B8]">Próximo Vencimiento</span>
          <span className="text-[18px] font-[900] text-white">En 2 días (15 May)</span>
          <span className="text-[10px] font-[500] text-[#FCD34D]">Internet Fibra Tigo • Bs. 280</span>
        </div>
      </div>

      {/* Section 1: Pagos y Servicios Programados */}
      <div className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-[800] text-[#0F172A]">
          Pagos y Servicios Programados
        </h2>

        <div className="flex flex-col gap-2">
          {payments.map((p) => {
            const isDueSoon = p.status === "DueSoon";
            const amountFormatted = p.currency === "BOB" ? `Bs. ${p.amount.toFixed(2)}` : `${p.amount} ${p.currency}`;

            return (
              <div
                key={p.id}
                className="h-[48px] px-3.5 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-3 hover:bg-slate-100/70 transition"
              >
                {/* Left: Name + Status */}
                <div className="flex items-center gap-2 min-w-[200px] truncate">
                  <span className="text-[13px] font-[700] text-[#0F172A] truncate">
                    {p.name}
                  </span>
                  <span
                    className={`text-[9px] font-[800] px-1.5 py-0.5 rounded ${
                      isDueSoon
                        ? "bg-amber-100 text-[#B45309]"
                        : "bg-blue-100 text-[#1D4ED8]"
                    }`}
                  >
                    {isDueSoon ? "⚠️ Por vencer" : "Programado"}
                  </span>
                </div>

                {/* Middle: Date + Account */}
                <div className="flex items-center gap-3 text-[11px] text-[#64748B] hidden md:flex shrink-0">
                  <span className="font-[500]">{p.dueDate} ({p.daysRemaining} días) • {p.periodicity}</span>
                  <span className="font-[600] text-[#0F172A]">{p.account}</span>
                </div>

                {/* Right: Amount + Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[13px] font-[800] text-[#0F172A] font-mono">
                    {amountFormatted}
                  </span>
                  <button
                    onClick={() => onOpenRescheduleModal(p)}
                    className="text-[11px] font-[700] text-[#2563EB] hover:underline"
                  >
                    📅 Modificar
                  </button>
                  <button
                    onClick={() => onPay1Click(p)}
                    className="h-[28px] px-3 rounded-[6px] bg-[#2563EB] hover:bg-blue-700 active:scale-95 text-white text-[11px] font-[800] transition"
                  >
                    Pagar 1-Clic
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Ingresos Fijos Periódicos */}
      <div className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-[800] text-[#0F172A]">
          Ingresos Fijos Periódicos
        </h2>

        <div className="flex flex-col gap-2">
          {/* Row 0: Sueldo */}
          <div className="h-[42px] px-3.5 rounded-[10px] border border-[#E2E8F0] bg-white flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="text-[12px] font-[700] text-[#0F172A]">
                💼 Sueldo Mensual Fijo
              </span>
              <span className="text-[11px] font-[500] text-[#166534] truncate hidden sm:inline">
                • Día 30 de cada mes • Banco Unión (Acreditación Automática)
              </span>
            </div>
            <span className="text-[13px] font-[900] text-[#15803D] font-mono shrink-0">
              +Bs. 12,000.00
            </span>
          </div>

          {/* Row 1: Honorarios Remoto */}
          <div className="h-[42px] px-3.5 rounded-[10px] border border-[#E2E8F0] bg-white flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="text-[12px] font-[700] text-[#0F172A]">
                💻 Honorarios Consultoría Remota USD
              </span>
              <span className="text-[11px] font-[500] text-[#166534] truncate hidden sm:inline">
                • Quincenal (días 15 y 30) • Binance P2P
              </span>
            </div>
            <span className="text-[13px] font-[900] text-[#15803D] font-mono shrink-0">
              +650.00 USDT (≈ Bs. {(650 * p2pRate).toFixed(2)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
