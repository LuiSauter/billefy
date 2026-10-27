import Decimal from "decimal.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface BalanceSummaryCardsProps {
  bobTotal: Decimal;
  usdTotal: Decimal;
  consolidatedUsd: Decimal;
}

export function BalanceSummaryCards({
  bobTotal,
  usdTotal,
  consolidatedUsd,
}: BalanceSummaryCardsProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Saldo Total en Bolivianos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-500 font-mono">
            {bobTotal.toFixed(2)} BOB
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Saldo Total en Dólares</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-500 font-mono">
            {usdTotal.toFixed(2)} USD
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-blue-900 dark:text-blue-300">Patrimonio Consolidado (USD)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-950 dark:text-blue-200 font-mono">
            {consolidatedUsd.toFixed(2)} USD
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">Valuado a tasa de compra P2P (Regla 19)</p>
        </CardContent>
      </Card>
    </section>
  );
}
