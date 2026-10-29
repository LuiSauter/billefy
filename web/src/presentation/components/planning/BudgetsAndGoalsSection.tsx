import { BudgetDto, GoalDto } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface BudgetsAndGoalsSectionProps {
  budgets: BudgetDto[];
  goals: GoalDto[];
}

export function BudgetsAndGoalsSection({
  budgets,
  goals,
}: BudgetsAndGoalsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Budgets */}
      <Card className="overflow-hidden shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3 px-6">
          <CardTitle className="text-base font-semibold">Presupuestos Mensuales ({budgets.length})</CardTitle>
          <span className="text-xs text-muted-foreground">Límites y alertas</span>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {budgets.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No tienes presupuestos activos. Crea uno para controlar tus gastos mensuales.
            </div>
          ) : (
            budgets.map((b) => (
              <div key={b.id} className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span>Presupuesto General ({b.currency})</span>
                  <span
                    className={
                      b.isExceeded
                        ? "text-destructive font-bold"
                        : b.isAlertTriggered
                        ? "text-amber-600 font-bold"
                        : "text-foreground"
                    }
                  >
                    {b.spentAmount.toFixed(2)} / {b.limitAmount.toFixed(2)} {b.currency} ({b.percentageUsed.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      b.isExceeded
                        ? "bg-rose-600"
                        : b.isAlertTriggered
                        ? "bg-amber-500"
                        : "bg-emerald-600"
                    }`}
                    style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Restante: {b.remainingAmount.toFixed(2)} {b.currency}</span>
                  {b.isExceeded && <span className="text-rose-600 font-semibold">¡Límite excedido!</span>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Goals */}
      <Card className="overflow-hidden shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3 px-6">
          <CardTitle className="text-base font-semibold">Metas de Ahorro ({goals.length})</CardTitle>
          <span className="text-xs text-muted-foreground">Progreso y cuota</span>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {goals.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No tienes metas de ahorro definidas. Crea una para planificar objetivos futuros.
            </div>
          ) : (
            goals.map((g) => (
              <div key={g.id} className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span>{g.name}</span>
                  <span className="font-mono text-emerald-600 font-bold">
                    {g.currentAmount.toFixed(2)} / {g.targetAmount.toFixed(2)} {g.currency} ({g.percentageAchieved.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${Math.min(100, g.percentageAchieved)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{g.monthsRemaining ? `${g.monthsRemaining} meses restantes` : "Sin fecha límite"}</span>
                  {g.monthlyContributionNeeded && (
                    <span className="font-semibold text-foreground">
                      Aporte sugerido: {g.monthlyContributionNeeded.toFixed(2)}/mes
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
