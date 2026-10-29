"use client";

import React from "react";
import { IncomeDistributionProposal } from "@/modules/planning/domain/planning.types";

export function ProposalBreakdown({ proposal }: { proposal: IncomeDistributionProposal }) {
  const buckets = [
    {
      key: "needs",
      label: "Necesidades",
      amount: proposal.needsAmount,
      percentage: proposal.needsPercentage,
      bar: "bg-chart-1",
    },
    {
      key: "wants",
      label: "Deseos",
      amount: proposal.wantsAmount,
      percentage: proposal.wantsPercentage,
      bar: "bg-chart-3",
    },
    ...(proposal.debtPaymentAmount > 0
      ? [
          {
            key: "debt",
            label: "Cuotas de préstamos",
            amount: proposal.debtPaymentAmount,
            percentage: proposal.debtPercentage,
            bar: "bg-chart-5",
          },
        ]
      : []),
    {
      key: "savings",
      label: "Ahorros",
      amount: proposal.savingsAmount,
      percentage: proposal.savingsPercentage,
      bar: "bg-chart-2",
    },
  ];
  const clamp = (value: number) => Math.min(100, Math.max(0, value));

  return (
    <section
      aria-label="Propuesta de distribución"
      className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-4"
    >
      <h3 className="text-sm font-bold text-foreground">
        Regla 50/30/20 y cobertura de préstamos
      </h3>

      <div aria-hidden="true" className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {buckets.map((b) => (
          <div key={b.key} className={b.bar} style={{ width: `${clamp(b.percentage)}%` }} />
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {buckets.map((b) => (
          <li key={b.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">
                {b.label}{" "}
                <span className="font-medium text-muted-foreground tabular-nums">
                  ({b.percentage}%)
                </span>
              </span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {b.amount.toFixed(2)} {proposal.currency}
              </span>
            </div>
            <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${b.bar}`}
                style={{ width: `${clamp(b.percentage)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="text-sm leading-relaxed text-muted-foreground">{proposal.rationale}</p>
    </section>
  );
}
