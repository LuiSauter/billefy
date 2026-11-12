"use client";

import React, { useMemo, useState } from "react";
import type { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import type { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import type { BudgetDto } from "@/modules/planning/domain/planning.types";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/shared/ui/empty";
import { Skeleton } from "@/shared/ui/skeleton";
import { calculateFinancialReport } from "../domain/reports-analytics";
import { exportReportAsCsv } from "../application/report-export.service";
import { ReportsHeader, type ReportsPeriodMonths } from "./ReportsHeader";
import { ReportsNavTabs, type ReportsTab } from "./ReportsNavTabs";
import { ReportsKpiCards } from "./ReportsKpiCards";
import { IncomeVsExpensesChartCard } from "./IncomeVsExpensesChartCard";
import { CategoryExpensesDonutCard } from "./CategoryExpensesDonutCard";
import { ReportGenerationCard } from "./ReportGenerationCard";
import { NetWorthEvolutionChartCard } from "./NetWorthEvolutionChartCard";
import { PeriodSummaryMetricsCard } from "./PeriodSummaryMetricsCard";
import { PopularReportsCard } from "./PopularReportsCard";
import { PeriodConclusionBanner } from "./PeriodConclusionBanner";

interface ReportsViewProps {
  transactions: TransactionDto[];
  accounts: AccountDto[];
  loans?: LoanSummaryDto[];
  budgets?: BudgetDto[];
  selectedCurrency?: string;
  onToggleCurrency?: () => void;
  p2pRate?: number;
  loading?: boolean;
  onNavigateToTab?: (tab: string) => void;
}

type ActiveReportTab = "general" | "cashflow" | "accounts" | "investments" | "patrimonio" | "custom";
// The shared navigation uses different identifiers than the view's report state.
const navTabs: Record<ActiveReportTab, ReportsTab> = {
  general: "overview", cashflow: "income-expenses", accounts: "accounts",
  investments: "investments", patrimonio: "net-worth", custom: "custom",
};
const popularReports: Record<string, { label: string; tab: ActiveReportTab }> = {
  "monthly-summary": { label: "Resumen mensual", tab: "general" },
  "cash-flow": { label: "Flujo de efectivo", tab: "cashflow" },
  "investment-performance": { label: "Rendimiento de inversiones", tab: "investments" },
  "net-worth": { label: "Evolución del patrimonio", tab: "patrimonio" },
};

function ReportSection({ label, highlighted, children }: {
  label: string; highlighted: boolean; children: React.ReactNode;
}) {
  return (
    <section aria-label={label} data-highlighted={highlighted || undefined}
      className={`min-w-0 rounded-xl ${highlighted ? "ring-2 ring-purple-500/60 ring-offset-2 ring-offset-background" : ""}`}>
      {children}
    </section>
  );
}

export function ReportsView({
  transactions, accounts, loans, budgets, selectedCurrency = "BOB", onToggleCurrency, p2pRate,
  loading = false, onNavigateToTab,
}: ReportsViewProps) {
  const [periodMonths, setPeriodMonths] = useState<ReportsPeriodMonths>(6);
  const [activeReportTab, setActiveReportTab] = useState<ActiveReportTab>("general");
  const [selectedPopularReport, setSelectedPopularReport] = useState<string>("");
  const [exportError, setExportError] = useState(false);
  const report = useMemo(() => {
    if (loading || transactions.length === 0) return null;
    try {
      return calculateFinancialReport({ transactions, accounts, loans, budgets, periodMonths, selectedCurrency, p2pRate });
    } catch (err) {
      console.error("[ReportsView] calculateFinancialReport failed:", err);
      // Missing FX rates or invalid financial inputs must not become invented totals.
      return null;
    }
  }, [transactions, accounts, loans, budgets, periodMonths, selectedCurrency, p2pRate, loading]);

  function changePeriod(months: ReportsPeriodMonths) {
    setPeriodMonths(months);
    setExportError(false);
  }

  function exportSummary() {
    if (!report) return;
    try {
      exportReportAsCsv(report, "financial-summary", selectedCurrency);
      setExportError(false);
    } catch {
      setExportError(true);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-5" aria-busy={loading}>
      <ReportsHeader
        periodMonths={periodMonths}
        onPeriodChange={changePeriod}
        onExport={report ? exportSummary : undefined}
        selectedCurrency={selectedCurrency}
        onToggleCurrency={onToggleCurrency}
        p2pRate={p2pRate}
      />
      <ReportsNavTabs activeTab={navTabs[activeReportTab]} onTabChange={(tab) => {
        const entry = Object.entries(navTabs).find(([, value]) => value === tab);
        if (entry) setActiveReportTab(entry[0] as ActiveReportTab);
        setSelectedPopularReport("");
      }} />
      {loading ? (
        <div role="status" aria-label="Cargando reportes" className="space-y-5">
          <span className="sr-only">Cargando reportes…</span>
          <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
          </div>
          <div aria-hidden="true" className="grid gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-72 rounded-xl" />)}
          </div>
          <Skeleton aria-hidden="true" className="h-28 rounded-xl" />
        </div>
      ) : transactions.length === 0 ? (
        <Empty className="min-h-80 border">
          <EmptyHeader>
            <EmptyTitle>Sin movimientos para analizar</EmptyTitle>
            <EmptyDescription>Registra tus primeros ingresos y gastos para consultar tus reportes financieros.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : !report ? (
        <p role="alert" className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
          No se pudo calcular el reporte. Revisa los datos y el tipo de cambio de las monedas utilizadas.
        </p>
      ) : (
        <>
          {exportError && <p role="alert" className="text-sm text-destructive">No se pudo exportar el reporte. Intenta de nuevo.</p>}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-card/60 px-4 py-2.5 text-xs text-muted-foreground shadow-2xs">
            <span>
              Valores unificados en <strong className="text-foreground">{selectedCurrency === "USD" ? "Dólares ($)" : "Bolivianos (Bs.)"}</strong> (≈ aprox. P2P {p2pRate ? `Bs. ${Number(p2pRate).toFixed(2)}` : "9.85"}). Cada cuenta conserva su saldo en su moneda original.
            </span>
          </div>
          {selectedPopularReport && <p role="status" className="text-sm text-muted-foreground">
            Reporte seleccionado: {popularReports[selectedPopularReport]?.label}. Las secciones relacionadas están resaltadas.
          </p>}
          {activeReportTab === "investments" && <p className="text-sm text-muted-foreground">
            Ahorro / Inversión representa el excedente del período, no la rentabilidad de inversiones. Consulta Inversiones para ver su rendimiento.
          </p>}
          <ReportSection label="Indicadores financieros" highlighted={activeReportTab === "investments" || selectedPopularReport === "monthly-summary"}>
            <ReportsKpiCards kpis={report.kpis} selectedCurrency={selectedCurrency} />
          </ReportSection>
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
            <ReportSection label="Flujo de ingresos y gastos" highlighted={activeReportTab === "cashflow"}>
              <IncomeVsExpensesChartCard data={report.cashFlowEvolution} selectedCurrency={selectedCurrency} />
            </ReportSection>
            <ReportSection label="Distribución de gastos" highlighted={activeReportTab === "cashflow"}>
              <CategoryExpensesDonutCard data={report.categoryExpenses} totalExpenses={report.kpis.totalExpenses} selectedCurrency={selectedCurrency} />
            </ReportSection>
            <ReportSection label="Generación de reportes" highlighted={activeReportTab === "custom"}>
              <ReportGenerationCard reportData={report} selectedCurrency={selectedCurrency} periodMonths={periodMonths} onPeriodChange={changePeriod} />
            </ReportSection>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
            <ReportSection label="Patrimonio de cuentas y préstamos" highlighted={activeReportTab === "accounts" || activeReportTab === "patrimonio"}>
              <NetWorthEvolutionChartCard data={report.netWorthEvolution} selectedCurrency={selectedCurrency} />
            </ReportSection>
            <ReportSection label="Métricas del período" highlighted={selectedPopularReport === "monthly-summary"}>
              <PeriodSummaryMetricsCard summary={report.periodSummary} />
            </ReportSection>
            <PopularReportsCard onSelectReport={(id) => {
              const selection = popularReports[id];
              if (!selection) return;
              setSelectedPopularReport(id);
              setActiveReportTab(selection.tab);
            }} />
          </div>
          <PeriodConclusionBanner conclusion={report.conclusion} onViewRecommendations={onNavigateToTab ? () => {
            onNavigateToTab(report.conclusion.healthStatus === "warning" || report.conclusion.healthStatus === "critical" ? "presupuestos" : "metas");
          } : undefined} />
        </>
      )}
    </div>
  );
}
