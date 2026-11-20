"use client";

import React, { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { FormField } from "@/shared/ui/form-field";
import { SelectField } from "@/shared/ui/select-field";
import type { FinancialReport } from "../domain/reports-analytics";
import { exportReportAsCsv, exportReportAsJson, exportReportAsPrintable, type ReportType } from "../application/report-export.service";
import type { ReportsPeriodMonths } from "./ReportsHeader";
import { REPORT_CTA_CLASS } from "./reports-shared";

interface ReportGenerationCardProps {
  reportData: FinancialReport;
  selectedCurrency: string;
  periodMonths: ReportsPeriodMonths;
  /** Recalculate reportData for the requested period; aggregates cannot be sliced. */
  onPeriodChange: (periodMonths: ReportsPeriodMonths) => void;
}

type ReportFormat = "pdf" | "csv" | "json";
const reportTypes = [
  { value: "financial-summary", label: "Resumen financiero" },
  { value: "cash-flow", label: "Flujo de efectivo" },
  { value: "category-expenses", label: "Gastos por categoría" },
  { value: "net-worth", label: "Evolución del patrimonio" },
] satisfies { value: ReportType; label: string }[];
const periods = [
  { value: "6", label: "Últimos 6 meses" },
  { value: "3", label: "Últimos 3 meses" },
  { value: "1", label: "Este mes" },
  { value: "12", label: "Último año" },
];
const formats = [
  { value: "pdf", label: "PDF" }, { value: "csv", label: "CSV" }, { value: "json", label: "JSON" },
] satisfies { value: ReportFormat; label: string }[];

export function ReportGenerationCard({ reportData, selectedCurrency, periodMonths, onPeriodChange }: ReportGenerationCardProps) {
  const [reportType, setReportType] = useState<ReportType>("financial-summary");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const exporter = { csv: exportReportAsCsv, json: exportReportAsJson, pdf: exportReportAsPrintable }[format];
      // The popup is opened synchronously with the user gesture so popup blockers allow it;
      // the exporter itself waits for the popup to load before printing.
      exporter(reportData, reportType, selectedCurrency);
      setFeedback({ kind: "success", message: format === "pdf"
        ? "Vista de impresión abierta. Puedes guardar el reporte como PDF."
        : "Descarga del reporte iniciada." });
    } catch {
      setFeedback({ kind: "error", message: format === "pdf"
        ? "No se pudo abrir la impresión. Permite las ventanas emergentes e intenta de nuevo."
        : "No se pudo descargar el reporte. Intenta de nuevo." });
    }
  }

  return (
    <Card className="min-w-0 border-border/80">
      <CardHeader>
        <h2 className="flex items-center gap-3 text-lg font-bold tracking-tight">
          <FileText aria-hidden="true" className="size-6 shrink-0 text-purple-300" />Generar reporte
        </h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={generate} className="space-y-4">
          <FormField label="Tipo de reporte">
            {(control) => <SelectField {...control} value={reportType} options={reportTypes} onChange={(event) => {
              const type = reportTypes.find((option) => option.value === event.target.value);
              if (type) { setReportType(type.value); setFeedback(null); }
            }} />}
          </FormField>
          <FormField label="Período">
            {(control) => <SelectField {...control} value={String(periodMonths)} options={periods} onChange={(event) => {
              const period = periods.find((option) => option.value === event.target.value);
              if (period) { onPeriodChange(Number(period.value) as ReportsPeriodMonths); setFeedback(null); }
            }} />}
          </FormField>
          <FormField label="Formato">
            {(control) => <SelectField {...control} value={format} options={formats} onChange={(event) => {
              const next = formats.find((option) => option.value === event.target.value);
              if (next) { setFormat(next.value); setFeedback(null); }
            }} />}
          </FormField>
          <Button type="submit" className={cn(REPORT_CTA_CLASS, "w-full shadow-sm")}>
            <Download aria-hidden="true" />Generar reporte
          </Button>
          {feedback && <p role={feedback.kind === "error" ? "alert" : "status"}
            className={`text-sm ${feedback.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {feedback.message}
          </p>}
        </form>
      </CardContent>
    </Card>
  );
}
