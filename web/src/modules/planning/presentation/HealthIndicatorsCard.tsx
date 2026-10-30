import { FinancialHealthDto } from "@/modules/planning/domain/planning.types";

interface HealthIndicatorsCardProps {
  health: FinancialHealthDto | null;
}

export function HealthIndicatorsCard({ health }: HealthIndicatorsCardProps) {
  if (!health) return null;

  const savingsRatePct = health.savingsRate <= 1 ? (health.savingsRate * 100).toFixed(1) : health.savingsRate.toFixed(1);

  return (
    <div className="w-full rounded-[16px] bg-card border border-border shadow-2xs overflow-hidden flex flex-col">
      <div className="py-3 px-6 border-b border-border bg-background/60">
        <h3 className="text-[15px] font-extrabold text-foreground">
          📊 Indicadores de Salud Financiera (Mes en Curso)
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-background rounded-[12px] border border-border">
            <div className="text-xs font-semibold text-muted-foreground">Tasa de Ahorro</div>
            <div className="text-[20px] font-black font-mono text-emerald-400">{savingsRatePct}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">del ingreso neto</div>
          </div>

          <div className="p-3 bg-background rounded-[12px] border border-border">
            <div className="text-xs font-semibold text-muted-foreground">Fondo de Emergencia</div>
            <div className="text-[20px] font-black font-mono text-primary">{health.emergencyFundMonths.toFixed(1)} meses</div>
            <div className="text-xs text-muted-foreground mt-0.5">de gastos cubiertos</div>
          </div>

          <div className="p-3 bg-background rounded-[12px] border border-border">
            <div className="text-xs font-semibold text-muted-foreground">Pasivos / Deudas</div>
            <div className="text-[20px] font-black font-mono text-violet-400">{health.totalDebtLiabilities.toFixed(2)} BOB</div>
            <div className="text-xs text-muted-foreground mt-0.5">capital adeudado</div>
          </div>

          <div className="p-3 bg-background rounded-[12px] border border-border">
            <div className="text-xs font-semibold text-muted-foreground">Regla 50 / 30 / 20</div>
            <div className="text-xs font-bold text-foreground mt-1">
              Nec: <span className="text-primary font-mono">{health.split503020.needsTarget.toFixed(0)}</span> | Des: <span className="text-amber-400 font-mono">{health.split503020.wantsTarget.toFixed(0)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Ahorro meta: {health.split503020.savingsTarget.toFixed(0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
