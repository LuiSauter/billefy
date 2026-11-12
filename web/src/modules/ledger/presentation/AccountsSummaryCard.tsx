"use client";

import React, { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { AccountDto, TransactionDto } from "@/modules/ledger/domain/ledger.types";
import {
  getAccountTypeLabel,
  resolveAccountVisualMeta,
} from "@/modules/ledger/domain/account-meta";
import { computeAccountMonthlyChanges } from "@/modules/ledger/domain/monthly-analytics";
import { CategoryIconBadge } from "./CategoryIcon";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatPercent } from "@/shared/lib/amount-format";
import { Amount } from "@/shared/ui/amount";

interface AccountsSummaryCardProps {
  accounts: AccountDto[];
  transactions: TransactionDto[];
  onOpenAccounts?: () => void;
}

export function ChangeBadge({ pct }: { pct: number | null }) {
  const preferences = useNumberPreferences();
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-muted-foreground">
        <Minus className="w-3 h-3" /> Sin base
      </span>
    );
  }
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold ${
        up ? "text-emerald-500" : "text-rose-500"
      }`}
    >
      <Icon className="w-3 h-3" />
      {pct < 0 ? "−" : up && pct !== 0 ? "+" : ""}
      {formatPercent(pct, preferences)}
    </span>
  );
}

export function AccountsSummaryCard({
  accounts,
  transactions,
  onOpenAccounts,
}: AccountsSummaryCardProps) {
  const changes = useMemo(
    () => computeAccountMonthlyChanges(accounts, transactions),
    [accounts, transactions]
  );

  return (
    <div className="w-full rounded-2xl bg-card border border-border p-5 shadow-2xs flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Resumen de cuentas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Variación vs. cierre del mes anterior
          </p>
        </div>
        {onOpenAccounts && (
          <button
            type="button"
            onClick={onOpenAccounts}
            className="text-xs font-bold text-primary hover:underline"
          >
            Ver todas
          </button>
        )}
      </div>

      {accounts.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Todavía no tenés cuentas.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/60">
          {accounts.map((acc) => {
            const meta = resolveAccountVisualMeta(acc);
            const change = changes.get(acc.id);
            return (
              <li key={acc.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryIconBadge iconKey={meta.iconKey} colorKey={meta.colorKey} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-foreground truncate">
                      {acc.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {getAccountTypeLabel(acc.type)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <Amount value={acc.balance} currency={acc.currency} size="sm" />
                  <ChangeBadge pct={change ? change.changePct : null} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
