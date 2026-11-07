import React from "react";
import { CircleCheck, HandCoins, Hourglass, Users, Wallet } from "lucide-react";
import type { LentMetrics } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Card } from "@/shared/ui/card";

export function DineroPrestadoKpiCards({ metrics }: { metrics: LentMetrics }) {
  const format = useNumberFormat();
  const items = [
    { label: "Total prestado", value: `${format(metrics.totalLent)} ${metrics.currency}`, icon: HandCoins, tone: "bg-white/15 text-white" },
    { label: "Total cobrado", value: `${format(metrics.totalCollected)} ${metrics.currency}`, note: `${format(metrics.collectedPercentage)}% del total`, icon: Wallet, tone: "bg-emerald-500/15 text-emerald-500" },
    { label: "Por cobrar", value: `${format(metrics.totalPending)} ${metrics.currency}`, note: `${format(metrics.pendingPercentage)}% del total`, icon: Hourglass, tone: "bg-amber-500/15 text-amber-500" },
    { label: "Préstamos activos", value: metrics.activeLoansCount, icon: Users, tone: "bg-violet-500/15 text-violet-500" },
    { label: "Préstamos finalizados", value: metrics.completedLoansCount, icon: CircleCheck, tone: "bg-emerald-500/15 text-emerald-500" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {items.map(({ label, value, note, icon: Icon, tone }, index) => (
        <Card key={label} className={`flex flex-row items-center gap-3 p-4 ${index === 0 ? "border-violet-400/30 bg-gradient-to-br from-violet-500 to-violet-800 text-white" : ""}`}>
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon className="size-6" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className={`text-sm ${index === 0 ? "text-white/90" : "text-muted-foreground"}`}>{label}</p>
            <p className="mt-1 break-words text-xl font-bold tabular-nums">{value}</p>
            {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}
