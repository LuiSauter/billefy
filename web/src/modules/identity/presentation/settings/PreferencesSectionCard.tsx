"use client";

import React from "react";
import { SlidersHorizontal, Sun, Calendar, LayoutDashboard, Hash } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import type { ThemeMode } from "@/shared/lib/theme-context";
import type { DateFormat, WeekStartsOn } from "@/shared/lib/date-preferences";

export interface PreferencesSettings {
  theme: ThemeMode;
  dateFormat: DateFormat;
  weekStartsOn: WeekStartsOn;
  defaultDashboard: string;
  numberGroupingConvention: "es-BO" | "en-US";
  maximumDecimalPlaces: number;
}

interface PreferencesSectionCardProps {
  settings: PreferencesSettings;
  onChange: (patch: Partial<PreferencesSettings>) => void;
}

export function PreferencesSectionCard({
  settings,
  onChange,
}: PreferencesSectionCardProps) {
  return (
    <Card className="lg:col-span-6 p-5 flex flex-col justify-between gap-4 bg-card border-border">
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="size-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground leading-none">
              Preferencias generales
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Personaliza el formato numérico, visualización y comportamiento.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-2 border-t border-border/60">
          {/* Formato numérico */}
          <div className="flex flex-col gap-1 sm:col-span-2 p-3 rounded-xl bg-muted/30 border border-border/50">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Hash className="size-3.5 text-primary" />
              <span>Agrupación de números</span>
            </label>
            <NativeSelect
              value={settings.numberGroupingConvention}
              onChange={(e) =>
                onChange({
                  numberGroupingConvention: e.target.value as "es-BO" | "en-US",
                })
              }
            >
              <NativeSelectOption value="es-BO">
                Española (1.234,56) · Punto miles, coma decimal
              </NativeSelectOption>
              <NativeSelectOption value="en-US">
                Internacional (1,234.56) · Coma miles, punto decimal
              </NativeSelectOption>
            </NativeSelect>
          </div>

          {/* Decimales */}
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30 border border-border/50">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Hash className="size-3.5 text-primary" />
              <span>Decimales</span>
            </label>
            <NativeSelect
              value={settings.maximumDecimalPlaces}
              onChange={(e) =>
                onChange({
                  maximumDecimalPlaces: Number(e.target.value) || 2,
                })
              }
            >
              <NativeSelectOption value={0}>0 decimales (enteros)</NativeSelectOption>
              <NativeSelectOption value={2}>2 decimales (estándar)</NativeSelectOption>
              <NativeSelectOption value={3}>3 decimales</NativeSelectOption>
              <NativeSelectOption value={4}>4 decimales (cripto/FX)</NativeSelectOption>
            </NativeSelect>
          </div>

          {/* Tema */}
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30 border border-border/50">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sun className="size-3.5 text-amber-500" />
              <span>Tema</span>
            </label>
            <NativeSelect
              value={settings.theme}
              onChange={(e) =>
                onChange({ theme: e.target.value as ThemeMode })
              }
            >
              <NativeSelectOption value="system">Sistema (automático)</NativeSelectOption>
              <NativeSelectOption value="dark">Oscuro</NativeSelectOption>
              <NativeSelectOption value="light">Claro</NativeSelectOption>
            </NativeSelect>
          </div>

          {/* Formato de fecha */}
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30 border border-border/50">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              <span>Formato de fecha</span>
            </label>
            <NativeSelect
              value={settings.dateFormat}
              onChange={(e) =>
                onChange({ dateFormat: e.target.value as DateFormat })
              }
            >
              <NativeSelectOption value="DD/MM/AAAA">DD/MM/AAAA (ej. 31/12/2026)</NativeSelectOption>
              <NativeSelectOption value="AAAA-MM-DD">AAAA-MM-DD (ISO 8601)</NativeSelectOption>
              <NativeSelectOption value="MM/DD/AAAA">MM/DD/AAAA (EE. UU.)</NativeSelectOption>
            </NativeSelect>
          </div>

          {/* Inicio de semana */}
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30 border border-border/50">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              <span>Inicio de semana</span>
            </label>
            <NativeSelect
              value={settings.weekStartsOn}
              onChange={(e) =>
                onChange({ weekStartsOn: e.target.value as WeekStartsOn })
              }
            >
              <NativeSelectOption value="lunes">Lunes (estándar ISO)</NativeSelectOption>
              <NativeSelectOption value="domingo">Domingo</NativeSelectOption>
            </NativeSelect>
          </div>

          {/* Dashboard por defecto */}
          <div className="flex flex-col gap-1 sm:col-span-2 p-3 rounded-xl bg-muted/30 border border-border/50">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <LayoutDashboard className="size-3.5 text-primary" />
              <span>Dashboard por defecto</span>
            </label>
            <NativeSelect
              value={settings.defaultDashboard}
              onChange={(e) => onChange({ defaultDashboard: e.target.value })}
            >
              <NativeSelectOption value="inicio">Inicio (resumen financiero)</NativeSelectOption>
              <NativeSelectOption value="movimientos">Movimientos</NativeSelectOption>
              <NativeSelectOption value="cuentas">Cuentas</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </div>
    </Card>
  );
}
