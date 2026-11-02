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
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { formatNumber } from "@/shared/lib/number-format";

interface AccountsSummaryCardProps {
  accounts: AccountDto[];
  transactions: TransactionDto[];
  onOpenAccounts?: () => void;
}

export function formatAccountAmount(currency: string, value: number | import("decimal.js").default, formatter: (value: number | import("decimal.js").default) => string = (amount) => formatNumber(amount)): string {
  const n = formatter(value);
  if (currency === "BOB") return `Bs ${n}`;
  if (currency === "USD") return `$${n}`;
  return `${n} ${currency}`;
}

export function ChangeBadge({ pct }: { pct: number | null }) {
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
      {up ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

export function AccountsSummaryCard({
  accounts,
  transactions,
  onOpenAccounts,
}: AccountsSummaryCardProps) {
  const format = useNumberFormat();
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
                  <span className="text-sm font-extrabold font-mono tabular-nums text-foreground">
                    {formatAccountAmount(acc.currency, acc.balance, format)}
                  </span>
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
