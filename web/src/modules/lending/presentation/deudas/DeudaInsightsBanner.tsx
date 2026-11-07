import React from "react";
import { CircleCheck, Lightbulb } from "lucide-react";
import type { LendingInsight } from "../../domain/lending-analytics";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";

const titles: Record<string, string> = {
  avalanche: "Paga primero el interés más alto",
  dti: "Cuida tu ratio deuda / ingreso",
  automation: "Automatiza tus pagos",
  "no-debt": "Conserva tu salud financiera",
};

export function DeudaInsightsBanner({ insights }: { insights: LendingInsight[] }) {
  return (
    <Card className="border-violet-500/40 bg-gradient-to-r from-violet-500/5 to-transparent">
      <CardHeader><h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-500"><Lightbulb className="size-6 text-amber-500" aria-hidden="true" />Insights y recomendaciones</h2></CardHeader>
      <CardContent>
        <ul className="grid gap-5 md:grid-cols-3">
          {insights.map((insight) => (
            <li key={insight.id} className="flex gap-3 md:border-l md:border-border md:pl-5 md:first:border-0 md:first:pl-0">
              <CircleCheck className={`mt-0.5 size-6 shrink-0 ${insight.type === "warning" ? "text-amber-500" : "text-emerald-500"}`} aria-hidden="true" />
              <div><h3 className="text-sm font-semibold">{titles[insight.id] ?? "Recomendación"}</h3><p className="mt-1 text-sm text-muted-foreground">{insight.text}</p></div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
