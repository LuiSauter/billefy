"use client";

import React, { useState } from "react";
import { Plus, Calendar, AlertTriangle, Briefcase, Laptop } from "lucide-react";

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
      daysRemaining: 12,
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
      daysRemaining: 90,
      periodicity: "Anual",
      status: "Scheduled",
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Pagos Programados & Flujo Recurrente
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administración de suscripciones, servicios, sueldos y cobros periódicos en BOB y USDT
          </p>
        </div>

        <button
          onClick={() => alert("Función: Programar Nuevo Flujo")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-md shadow-blue-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Programar Nuevo Flujo</span>
        </button>
      </div>

      {/* Dark Summary Banner (OpenPencil 09) */}
      <div className="p-6 rounded-2xl bg-[#0B132B] text-white shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1">Ingresos Fijos Mensuales</div>
          <div className="text-2xl font-extrabold tracking-tight font-mono text-emerald-400">
            +Bs. 18,500.00
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">2 Fuentes activas</p>
        </div>

        <div>
          <div className="text-xs text-slate-400 font-medium mb-1">Pagos & Compromisos Fijos</div>
          <div className="text-2xl font-extrabold tracking-tight font-mono text-rose-400">
            -Bs. 4,680.00
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">4 Servicios programados</p>
        </div>

        <div>
          <div className="text-xs text-slate-400 font-medium mb-1">Margen Recurrente Libre</div>
          <div className="text-2xl font-extrabold tracking-tight font-mono text-white">
            +Bs. 13,820.00
          </div>
          <p className="text-[11px] text-blue-400 mt-0.5">74.7% de liquidez disponible</p>
        </div>

        <div>
          <div className="text-xs text-slate-400 font-medium mb-1">Próximo Vencimiento</div>
          <div className="text-2xl font-extrabold tracking-tight font-mono text-amber-400">
            En 2 días (15 May)
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Internet Fibra Tigo · Bs. 280</p>
        </div>
      </div>

      {/* Section 1: Pagos y Servicios Programados */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Pagos y Servicios Programados
        </h2>

        <div className="space-y-3">
          {payments.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{item.name}</span>
                  {item.status === "DueSoon" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>Por vencer</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      Programado
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500">
                  {item.dueDate} ({item.daysRemaining} días) · {item.periodicity} · {item.account}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-base font-extrabold font-mono text-slate-900">
                  {item.currency === "BOB" ? "Bs. " : ""}
                  {item.amount.toFixed(2)}
                  {item.currency !== "BOB" ? ` ${item.currency}` : ""}
                </span>

                <button
                  onClick={() => onOpenRescheduleModal(item)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Modificar</span>
                </button>

                <button
                  onClick={() => onPay1Click(item)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold transition shadow-xs"
                >
                  Pagar 1-Clic
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Ingresos Fijos Periódicos */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Ingresos Fijos Periódicos
        </h2>

        <div className="space-y-3">
          {/* Sueldo */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900">Sueldo Mensual Fijo</span>
                <p className="text-xs text-slate-500">
                  Día 30 de cada mes · Banco Unión (Acreditación Automática)
                </p>
              </div>
            </div>
            <div className="text-base font-extrabold font-mono text-emerald-700">
              +Bs. 12,000.00
            </div>
          </div>

          {/* Honorarios Remotos */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900">
                  Honorarios Consultoría Remota USD
                </span>
                <p className="text-xs text-slate-500">
                  Quincenal (días 15 y 30) · Binance P2P
                </p>
              </div>
            </div>
            <div className="text-base font-extrabold font-mono text-emerald-700">
              +650.00 USDT (≈ Bs. {(650 * p2pRate).toFixed(2)})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
