import React from "react";
import { FinancialHealthDto } from "@/modules/planning/domain/planning.types";
import { netCashFlowHint } from "@/modules/planning/domain/goals-overview";
import { createMoney, formatMoney } from "@/shared/domain/money";

interface HealthIndicatorsCardProps { health: FinancialHealthDto | null; loading?: boolean; error?: Error | null; onRetry?: () => void; }
function money(value: number, currency: string) { return formatMoney(createMoney(value, currency), ["BTC", "ETH"].includes(currency.toUpperCase()) ? 8 : 2); }
function monthLabel(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Mes actual";
  return new Intl.DateTimeFormat("es", { month: "long", year: "numeric", timeZone: "UTC" }).format(parsed);
}
export function HealthIndicatorsCard({ health, loading = false, error = null, onRetry = () => {} }: HealthIndicatorsCardProps) {
  const retry = <button type="button" onClick={onRetry} className="min-h-11 rounded-lg border border-border px-4 font-semibold hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Reintentar</button>;
  return <section aria-labelledby="health-heading" className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6">
    <h2 id="health-heading" className="text-lg font-extrabold">Tu mes</h2>
    {health && <p className="mt-1 text-sm capitalize text-muted-foreground">{monthLabel(health.monthStartUtc)} · importes separados por moneda</p>}
    {loading && !health && <p role="status" className="mt-4 text-sm text-muted-foreground">Cargando resumen…</p>}
    {error && <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span>{health ? "No se pudo actualizar el resumen. Los datos pueden estar desactualizados." : "No se pudo cargar el resumen financiero."}</span>{retry}</div>}
    {!loading && !error && !health && <p className="mt-4 text-sm text-muted-foreground">No hay datos del resumen para mostrar.</p>}
    {health && health.currencies.length === 0 && <p className="mt-4 rounded-xl bg-background p-4 text-sm text-muted-foreground">Sin actividad o saldos para este mes.</p>}
    {health && health.currencies.length > 0 && <ul className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">{health.currencies.map((item) => <li key={item.currency} className="min-w-0 rounded-xl border border-border bg-background p-4">
      <h3 className="font-bold">{item.currency}</h3>
      <dl className="mt-3 grid min-w-0 gap-y-2 text-sm">
        <div className="flex min-w-0 flex-wrap justify-between gap-x-2"><dt className="text-muted-foreground">Ingresos del mes</dt><dd className="max-w-full break-all text-right font-mono">{money(item.monthlyIncome, item.currency)}</dd></div>
        <div className="flex min-w-0 flex-wrap justify-between gap-x-2"><dt className="text-muted-foreground">Gastos del mes</dt><dd className="max-w-full break-all text-right font-mono">{money(item.monthlyExpenses, item.currency)}</dd></div>
        <div className={`flex min-w-0 flex-wrap justify-between gap-x-2 font-semibold ${item.netCashFlow < 0 ? "text-rose-600 dark:text-rose-400" : ""}`}><dt>{item.netCashFlow < 0 ? "Déficit del mes" : "Flujo neto"}</dt><dd className="max-w-full break-all text-right font-mono">{money(item.netCashFlow, item.currency)}</dd></div>
        <div className="flex min-w-0 flex-wrap justify-between gap-x-2"><dt className="text-muted-foreground">Tasa de ahorro</dt><dd className="font-mono">{item.savingsRatePercentage === null ? "No disponible" : `${item.savingsRatePercentage}%`}</dd></div>
        <div className="flex min-w-0 flex-wrap justify-between gap-x-2"><dt className="text-muted-foreground">Saldo actual</dt><dd className="max-w-full break-all text-right font-mono">{money(item.currentBalance, item.currency)}</dd></div>
        <div className="flex min-w-0 flex-wrap justify-between gap-x-2"><dt className="text-muted-foreground">Capital de deuda pendiente</dt><dd className="max-w-full break-all text-right font-mono">{money(item.outstandingDebtPrincipal, item.currency)}</dd></div>
      </dl>
      {netCashFlowHint(item.monthlyIncome, item.monthlyExpenses) && <p className="mt-3 rounded-lg bg-rose-500/10 p-2 text-sm text-rose-700 dark:text-rose-300">{netCashFlowHint(item.monthlyIncome, item.monthlyExpenses)}</p>}
    </li>)}</ul>}
  </section>;
}
