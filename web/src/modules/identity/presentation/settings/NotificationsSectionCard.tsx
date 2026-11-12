"use client";

import React from "react";
import { Bell, Target, CalendarClock, Trophy, TrendingUp, Mail } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { SettingSwitchRow } from "./SettingSwitchRow";

export interface NotificationsSettings {
  budgetAlerts: boolean;
  debtDueAlerts: boolean;
  goalsAlerts: boolean;
  largeMovementsAlerts: boolean;
  weeklySummary: boolean;
}

interface NotificationsSectionCardProps {
  settings: NotificationsSettings;
  onChange: (patch: Partial<NotificationsSettings>) => void;
}

export function NotificationsSectionCard({
  settings,
  onChange,
}: NotificationsSectionCardProps) {
  return (
    <Card className="lg:col-span-4 p-5 flex flex-col justify-between gap-4 bg-card border-border">
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Bell className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground leading-none">
              Notificaciones
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Elige qué alertas y recordatorios quieres recibir.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
          <SettingSwitchRow
            label={
              <span className="flex items-center gap-1.5">
                <Target className="size-3.5 text-primary" />
                Recordatorios de presupuesto
              </span>
            }
            description="Avisa cuando alcances el 80% o 100% de una categoría."
            checked={settings.budgetAlerts}
            onCheckedChange={(checked) => onChange({ budgetAlerts: checked })}
          />

          <SettingSwitchRow
            label={
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5 text-amber-500" />
                Alertas de vencimiento de deudas
              </span>
            }
            description="Recordatorios 3 días antes y el día del vencimiento."
            checked={settings.debtDueAlerts}
            onCheckedChange={(checked) => onChange({ debtDueAlerts: checked })}
          />

          <SettingSwitchRow
            label={
              <span className="flex items-center gap-1.5">
                <Trophy className="size-3.5 text-primary" />
                Metas
              </span>
            }
            description="Notifica avances y celebraciones al alcanzar un objetivo."
            checked={settings.goalsAlerts}
            onCheckedChange={(checked) => onChange({ goalsAlerts: checked })}
          />

          <SettingSwitchRow
            label={
              <span className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-rose-500" />
                Movimientos grandes
              </span>
            }
            description="Alertas inmediatas para gastos mayores a $ 100 USD."
            checked={settings.largeMovementsAlerts}
            onCheckedChange={(checked) => onChange({ largeMovementsAlerts: checked })}
          />

          <SettingSwitchRow
            label={
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-indigo-400" />
                Resumen semanal
              </span>
            }
            description="Reporte consolidado de balance y gastos cada domingo."
            checked={settings.weeklySummary}
            onCheckedChange={(checked) => onChange({ weeklySummary: checked })}
          />
        </div>
      </div>
    </Card>
  );
}
