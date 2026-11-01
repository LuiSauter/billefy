"use client";

import React from "react";
import {
  Moon,
  Sun,
  Coins,
  MessageCircle,
  ArrowDownUp,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Button } from "@/shared/ui/button";
import { useTheme } from "@/shared/lib/theme-context";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCurrency: "BOB" | "USD";
  onSelectCurrency: (currency: "BOB" | "USD") => void;
  onOpenFxTransfer: () => void;
  onOpenWhatsApp: () => void;
  onOpenBinance: () => void;
  planEnabled?: boolean;
  onTogglePlan?: (enabled: boolean) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  selectedCurrency,
  onSelectCurrency,
  onOpenFxTransfer,
  onOpenWhatsApp,
  onOpenBinance,
  planEnabled = false,
  onTogglePlan,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Configuraciones"
      description="Personaliza la apariencia, moneda de visualización e integraciones de Billefy."
      size="md"
      footer={
        <Button type="button" onClick={onClose} className="w-full sm:w-auto">
          Guardar y Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-5 py-2">
        {/* Theme Selector */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Apariencia del Sistema
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition text-left ${
                theme === "dark"
                  ? "bg-accent border-primary text-foreground ring-1 ring-primary/40"
                  : "bg-background border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <Moon className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">
                  Modo Oscuro
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Descanso visual
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition text-left ${
                theme === "light"
                  ? "bg-accent border-primary text-foreground ring-1 ring-primary/40"
                  : "bg-background border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">
                  Modo Claro
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Alto contraste diurno
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Display Currency Selector */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Moneda de Visualización Principal
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onSelectCurrency("BOB")}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition text-left ${
                selectedCurrency === "BOB"
                  ? "bg-accent border-primary text-foreground ring-1 ring-primary/40"
                  : "bg-background border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">
                  Bolivianos (BOB)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Símbolo: Bs.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectCurrency("USD")}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition text-left ${
                selectedCurrency === "USD"
                  ? "bg-accent border-primary text-foreground ring-1 ring-primary/40"
                  : "bg-background border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">
                  Dólares (USD)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Símbolo: $ / USDT
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Optional distribution plan */}
        {onTogglePlan && (
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Plan de distribución de ingresos
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={planEnabled}
              onClick={() => onTogglePlan(!planEnabled)}
              className="w-full p-3 rounded-xl bg-background border border-border hover:bg-muted flex items-center justify-between gap-3 transition text-left"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">
                  {planEnabled ? "Activado" : "Desactivado"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Opcional: repartí los ingresos reales del mes, sin transferencias, en grupos personalizables.
                  Ahorro/inversión puede ser solo objetivo, sin registro de aportes. Los presupuestos siguen limitando gastos por categoría.
                  Para activarlo, necesitás 2–8 grupos con porcentajes positivos que sumen 100%.
                </span>
              </div>
              <span
                className={`w-10 h-6 rounded-full p-0.5 transition shrink-0 ${
                  planEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    planEnabled ? "translate-x-4" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        )}

        {/* Integrations & Operations Quick Access */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Operaciones e Integraciones Conectadas
          </label>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFxTransfer();
              }}
              className="w-full p-3 rounded-xl bg-background border border-border hover:bg-muted flex items-center justify-between transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Repeat className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">
                    Transferir FX (BOB ↔ USD)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Conversión entre cuentas a tasa paralela P2P
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-primary">Abrir →</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWhatsApp();
              }}
              className="w-full p-3 rounded-xl bg-background border border-border hover:bg-muted flex items-center justify-between transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">
                    Bot de WhatsApp
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Captura de borradores por mensaje (solo respuesta)
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-500">Configurar →</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBinance();
              }}
              className="w-full p-3 rounded-xl bg-background border border-border hover:bg-muted flex items-center justify-between transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <ArrowDownUp className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">
                    Integración Binance P2P
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Sincronización de órdenes P2P en solo lectura
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-500">Conectar →</span>
            </button>
          </div>
        </div>

        {/* Privacy Info */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            Las automatizaciones (WhatsApp, Binance, CSV) crean únicamente borradores hasta tu confirmación manual.
          </span>
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
