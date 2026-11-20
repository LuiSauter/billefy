"use client";

import React from "react";
import { Link2, Info, Landmark, Coins, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";

interface BinanceStatus {
  connected: boolean;
  maskedApiKey?: string;
}

interface ConnectedAccountsSectionCardProps {
  binanceStatus?: BinanceStatus | null;
  onOpenBinance?: () => void;
  onOpenCsv?: () => void;
  onOpenWhatsApp?: () => void;
  onOpenFxTransfer?: () => void;
}

export function ConnectedAccountsSectionCard({
  binanceStatus,
  onOpenBinance,
  onOpenCsv,
  onOpenWhatsApp,
  onOpenFxTransfer,
}: ConnectedAccountsSectionCardProps) {
  return (
    <Card className="lg:col-span-5 p-5 flex flex-col justify-between gap-4 bg-card border-border">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Link2 className="size-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-extrabold text-foreground leading-none">
              Cuentas conectadas / fuentes de datos
            </h2>
            <span title="Conexiones y fuentes manuales" aria-label="Conexiones y fuentes manuales">
              <Info className="size-3.5 text-muted-foreground" />
            </span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
          Billefy funciona con seguimiento manual de tus finanzas. También podés importar datos de
          forma opcional desde archivos (CSV/Excel) o API de lectura.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-2 border-t border-border/60">
          {/* Banco (manual) */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <div className="size-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Landmark className="size-3.5" />
              </div>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">Banco (manual)</span>
              <span className="text-[10px] text-muted-foreground">Seguimiento manual</span>
            </div>
          </div>

          {/* Binance */}
          <button
            type="button"
            onClick={onOpenBinance}
            className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/60 transition text-left flex flex-col justify-between gap-2 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="size-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Coins className="size-3.5" />
              </div>
              {binanceStatus?.connected ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <span className="text-[10px] text-amber-400 font-semibold">Configurar</span>
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-foreground group-hover:text-primary transition block">
                Binance (manual)
              </span>
              <span className="text-[10px] text-muted-foreground">
                {binanceStatus?.connected && binanceStatus.maskedApiKey
                  ? `Conectado (${binanceStatus.maskedApiKey})`
                  : "API de solo lectura"}
              </span>
            </div>
          </button>

          {/* Payoneer (manual) */}
          <button
            type="button"
            onClick={onOpenCsv}
            className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/60 transition text-left flex flex-col justify-between gap-2 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="size-7 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center">
                <FileSpreadsheet className="size-3.5" />
              </div>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground group-hover:text-primary transition block">
                Payoneer (manual)
              </span>
              <span className="text-[10px] text-muted-foreground">Importación opcional</span>
            </div>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-1">
        <Button
          type="button"
          variant="link"
          size="xs"
          onClick={onOpenWhatsApp}
          className="text-emerald-500 hover:text-emerald-400 font-bold p-0 h-auto"
        >
          Configurar Bot WhatsApp →
        </Button>
        <Button
          type="button"
          variant="link"
          size="xs"
          onClick={onOpenFxTransfer}
          className="text-primary hover:text-primary/80 font-bold p-0 h-auto"
        >
          Transferir FX (P2P) →
        </Button>
      </div>
    </Card>
  );
}
