"use client";

import React from "react";
import { Globe, DollarSign } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { SettingSwitchRow } from "./SettingSwitchRow";
import type { CurrencyCatalogEntryDto } from "@/modules/fx/domain/fx.types";

export interface CurrencySettings {
  baseCurrency: string;
  showExchangeRates: boolean;
  manualRateRefresh: boolean;
}

interface CurrencySectionCardProps {
  settings: CurrencySettings;
  currencies: CurrencyCatalogEntryDto[];
  onChange: (patch: Partial<CurrencySettings>) => void;
}

export function CurrencySectionCard({
  settings,
  currencies,
  onChange,
}: CurrencySectionCardProps) {
  return (
    <Card className="lg:col-span-4 p-5 flex flex-col justify-between gap-4 bg-card border-border">
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Globe className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground leading-none">
              Moneda y región
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Configura tu divisa base y el comportamiento de cotizaciones.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4 pt-2 border-t border-border/60">
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30 border border-border/50">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-primary" />
              <span>Moneda base (consolidación)</span>
            </label>
            <NativeSelect
              value={settings.baseCurrency}
              onChange={(e) => onChange({ baseCurrency: e.target.value })}
            >
              {currencies.map((c) => (
                <NativeSelectOption key={c.code} value={c.code}>
                  {c.code} · {c.name} ({c.symbol})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-2 p-2 rounded-xl bg-muted/20 border border-border/40">
            <SettingSwitchRow
              label="Mostrar tasas de cambio"
              description="Muestra la cotización paralela P2P en el encabezado y balances"
              checked={settings.showExchangeRates}
              onCheckedChange={(checked) => onChange({ showExchangeRates: checked })}
            />

            <SettingSwitchRow
              label="Actualizar tasas manualmente"
              description="Permite forzar la actualización de tasas bajo demanda"
              checked={settings.manualRateRefresh}
              onCheckedChange={(checked) => onChange({ manualRateRefresh: checked })}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
