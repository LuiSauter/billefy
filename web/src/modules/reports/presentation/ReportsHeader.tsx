"use client";

import React from "react";
import { CalendarDays, Download } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { SelectField } from "@/shared/ui/select-field";

export type ReportsPeriodMonths = 1 | 3 | 6 | 12;

interface ReportsHeaderProps {
  periodMonths: ReportsPeriodMonths;
  onPeriodChange: (periodMonths: ReportsPeriodMonths) => void;
  onExport?: () => void;
}

const periods = [
  { months: 1, label: "Este mes" },
  { months: 3, label: "Últimos 3 meses" },
  { months: 6, label: "Últimos 6 meses" },
  { months: 12, label: "Último año" },
] satisfies { months: ReportsPeriodMonths; label: string }[];

export function ReportsHeader({ periodMonths, onPeriodChange, onExport }: ReportsHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Reportes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analiza tu salud financiera con informes detallados, tendencias y métricas clave.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1 sm:flex-none">
          <CalendarDays aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <SelectField
            aria-label="Período del reporte"
            value={String(periodMonths)}
            className="pl-10"
            options={periods.map(({ months, label }) => ({ value: String(months), label }))}
            onChange={(event) => {
              const period = periods.find(({ months }) => String(months) === event.target.value);
              if (period) onPeriodChange(period.months);
            }}
          />
        </div>
        <Button type="button" onClick={onExport} disabled={!onExport} className="bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-sm hover:from-purple-500 hover:to-violet-500">
          <Download aria-hidden="true" />
          Exportar reporte
        </Button>
      </div>
    </header>
  );
}
