"use client";

import React from "react";
import { LoanScheduleDto } from "@/modules/lending/domain/lending.types";
import { Amount } from "@/shared/ui/amount";
import { formatPercent } from "@/shared/lib/amount-format";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";

interface LoanSchedulePreviewProps {
  schedule: LoanScheduleDto;
  currency: string;
}

export function LoanSchedulePreview({ schedule, currency }: LoanSchedulePreviewProps) {
  const preferences = useNumberPreferences();
  return (
    <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <span className="text-xs text-muted-foreground block">TEA</span>
          <strong className="text-base font-extrabold text-foreground tabular-nums">
            {formatPercent(schedule.annualEffectiveRate * 100, preferences)}
          </strong>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">Total Intereses</span>
          <strong className="text-base font-extrabold text-foreground tabular-nums">
            <Amount value={schedule.totalInterest} currency={currency} size="sm" />
          </strong>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">Costo Total</span>
          <strong className="text-base font-extrabold text-primary tabular-nums">
            <Amount value={schedule.totalToPay} currency={currency} size="sm" tone="income" />
          </strong>
        </div>
      </div>

      <div className="max-h-48 overflow-auto border border-border rounded-xl divide-y divide-border text-xs bg-card">
        <div className="min-w-[340px]">
          <div className="grid grid-cols-5 font-bold py-2 px-3 bg-muted text-muted-foreground sticky top-0">
            <span>Cuota</span>
            <span>Vence</span>
            <span>Capital</span>
            <span>Interés</span>
            <span>Total</span>
          </div>
          {schedule.installments.map((inst) => (
            <div key={inst.number} className="grid grid-cols-5 py-2 px-3 items-center">
              <span className="font-sans font-semibold">#{inst.number}</span>
              <span>{inst.dueDate}</span>
              <Amount value={inst.principal} currency={currency} size="xs" />
              <Amount value={inst.interest} currency={currency} size="xs" />
              <Amount value={inst.total} currency={currency} size="xs" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
