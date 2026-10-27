import { FinancialHealthDto } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface HealthIndicatorsCardProps {
  health: FinancialHealthDto | null;
}

export function HealthIndicatorsCard({ health }: HealthIndicatorsCardProps) {
  if (!health) return null;

  return (
    <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs overflow-hidden">
      <CardHeader className="py-3 px-6 border-b border-emerald-100 dark:border-emerald-900/40">
        <CardTitle className="text-base font-semibold text-emerald-950 dark:text-emerald-200">
          📊 Indicadores de Salud Financiera (Mes en Curso)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-background rounded-lg border">
            <div className="text-xs text-muted-foreground">Tasa de Ahorro</div>
            <div className="text-xl font-bold font-mono text-emerald-600">{health.savingsRate.toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">del ingreso neto</div>
          </div>

          <div className="p-3 bg-background rounded-lg border">
            <div className="text-xs text-muted-foreground">Fondo de Emergencia</div>
            <div className="text-xl font-bold font-mono text-blue-600">{health.emergencyFundMonths.toFixed(1)} meses</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">de gastos cubiertos</div>
          </div>

          <div className="p-3 bg-background rounded-lg border">
            <div className="text-xs text-muted-foreground">Pasivos / Deudas</div>
            <div className="text-xl font-bold font-mono text-purple-600">{health.totalDebtLiabilities.toFixed(2)} BOB</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">capital adeudado</div>
          </div>

          <div className="p-3 bg-background rounded-lg border">
            <div className="text-xs text-muted-foreground">Regla 50 / 30 / 20</div>
            <div className="text-xs font-semibold mt-1">
              Nec: <span className="text-primary font-mono">{health.split503020.needsTarget.toFixed(0)}</span> | Des: <span className="text-amber-600 font-mono">{health.split503020.wantsTarget.toFixed(0)}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Ahorro meta: {health.split503020.savingsTarget.toFixed(0)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
