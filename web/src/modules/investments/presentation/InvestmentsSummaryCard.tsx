"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { toBob } from "@/modules/ledger/domain/monthly-analytics";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { ChangeBadge } from "@/modules/ledger/presentation/AccountsSummaryCard";
import {
  Investment,
  getKindLabel,
  investmentVariationPct,
} from "../domain/investment.types";

interface InvestmentsSummaryCardProps {
  investments: Investment[];
  p2pRate: number;
  onOpenInvestments: () => void;
}

export function InvestmentsSummaryCard({
  investments,
  p2pRate,
  onOpenInvestments,
}: InvestmentsSummaryCardProps) {
  const totalValue = investments.reduce(
    (a, i) => a + toBob(i.currentValue, i.currency, p2pRate),
    0
  );
  const totalCost = investments.reduce(
    (a, i) => a + toBob(i.initialValue, i.currency, p2pRate),
    0
  );
  const totalPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null;

  return (
    <div className="w-full rounded-2xl bg-card border border-border p-5 shadow-2xs flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Inversiones y activos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Valor actual en Bs.</p>
        </div>
        <button
          type="button"
          onClick={onOpenInvestments}
          className="text-xs font-bold text-primary hover:underline"
        >
          {investments.length === 0 ? "Registrar" : "Ver todo"}
        </button>
      </div>

      {investments.length === 0 ? (
        <div className="py-6 flex flex-col items-center gap-2 text-center">
          <TrendingUp className="w-6 h-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Registrá crypto, acciones, fondos o bienes raíces.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black font-mono text-foreground">
              Bs {Math.round(totalValue).toLocaleString("en-US")}
            </span>
            <ChangeBadge pct={totalPct} />
          </div>
          <ul className="flex flex-col divide-y divide-border/60">
            {investments.slice(0, 4).map((inv) => (
              <li key={inv.id} className="py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryIconBadge iconKey={inv.iconKey} colorKey={inv.colorKey} size="sm" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-foreground truncate">
                      {inv.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {getKindLabel(inv.kind)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-extrabold font-mono text-foreground">
                    {inv.currentValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                    {inv.currency}
                  </span>
                  <ChangeBadge pct={investmentVariationPct(inv)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
