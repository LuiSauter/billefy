"use client";

import React from "react";
import { LoanScheduleDto } from "@/modules/lending/domain/lending.types";

interface LoanSchedulePreviewProps {
  schedule: LoanScheduleDto;
  currency: string;
}

export function LoanSchedulePreview({ schedule, currency }: LoanSchedulePreviewProps) {
  return (
    <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <span className="text-xs text-muted-foreground block">TEA</span>
          <strong className="text-base font-extrabold text-foreground tabular-nums">
            {(schedule.annualEffectiveRate * 100).toFixed(2)}%
          </strong>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">Total Intereses</span>
          <strong className="text-base font-extrabold text-foreground tabular-nums">
            {schedule.totalInterest.toFixed(2)} {currency}
          </strong>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">Costo Total</span>
          <strong className="text-base font-extrabold text-primary tabular-nums">
            {schedule.totalToPay.toFixed(2)} {currency}
          </strong>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border text-xs bg-card">
        <div className="grid grid-cols-5 font-bold py-2 px-3 bg-muted text-muted-foreground sticky top-0">
          <span>Cuota</span>
          <span>Vence</span>
          <span>Capital</span>
          <span>Interés</span>
          <span>Total</span>
        </div>
        {schedule.installments.map((inst) => (
          <div key={inst.number} className="grid grid-cols-5 py-2 px-3 items-center font-mono">
            <span className="font-sans font-semibold">#{inst.number}</span>
            <span>{inst.dueDate}</span>
            <span>{inst.principal.toFixed(2)}</span>
            <span>{inst.interest.toFixed(2)}</span>
            <span className="font-bold text-foreground">{inst.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
