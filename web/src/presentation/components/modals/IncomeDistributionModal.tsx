"use client";

import React, { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { IncomeDistributionProposal, ProposeIncomeDistributionRequest } from "@/domain/models/types";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { MoneyInput } from "@/components/ui/money-input";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { isPositiveDecimal } from "@/lib/money-input";
import { currencyChipLabel, normalizeAmountString } from "./keypad";

interface IncomeDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalculate: (req: ProposeIncomeDistributionRequest) => Promise<IncomeDistributionProposal>;
}

const FORM_ID = "income-distribution-form";

const CURRENCY_OPTIONS = [
  { value: "BOB", label: "BOB" },
  { value: "USD", label: "USD" },
  { value: "USDT", label: "USDT" },
];

export function IncomeDistributionModal({
  isOpen,
  onClose,
  onCalculate,
}: IncomeDistributionModalProps) {
  const [incomeAmount, setIncomeAmount] = useState("");
  const [currency, setCurrency] = useState("BOB");
  const [proposal, setProposal] = useState<IncomeDistributionProposal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const resultRef = useRef<HTMLDivElement>(null);

  // Reset the form whenever the drawer closes.
  useEffect(() => {
    if (!isOpen) {
      setIncomeAmount("");
      setCurrency("BOB");
      setProposal(null);
      setError(undefined);
    }
  }, [isOpen]);

  // Bring the result into view on small screens.
  useEffect(() => {
    if (proposal) resultRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [proposal]);

  const normalizedAmount = normalizeAmountString(incomeAmount);
  const isValid = isPositiveDecimal(normalizedAmount);
  const amountError =
    incomeAmount !== "" && !isValid ? "Ingresá un monto mayor a 0." : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError(undefined);
    try {
      const res = await onCalculate({
        // The API contract requires a number; the conversion stays local to this call.
        incomeAmount: Number(normalizedAmount),
        currency,
      });
      setProposal(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al calcular propuesta.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={
        <span className="flex items-center gap-2">
          <Lightbulb aria-hidden="true" className="size-5 text-warning" />
          Asistente de distribución de ingresos
        </span>
      }
      description="Calculá cómo repartir tu sueldo con la regla 50/30/20."
      footer={
        <>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            loading={submitting}
            disabled={!isValid}
            className="order-1 w-full md:order-2 md:flex-1"
          >
            {submitting ? "Calculando..." : "Calcular Distribución 50/30/20"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card"
          >
            Cerrar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FormField label="Moneda">
            {() => (
              <SegmentedControl
                aria-label="Moneda del ingreso"
                fullWidth
                options={CURRENCY_OPTIONS}
                value={currency}
                onChange={setCurrency}
              />
            )}
          </FormField>

          <FormField label="Monto de ingreso / sueldo" required error={amountError ?? error}>
            {(control) => (
              <MoneyInput
                {...control}
                size="lg"
                currency={currencyChipLabel(currency)}
                value={incomeAmount}
                onValueChange={setIncomeAmount}
              />
            )}
          </FormField>
        </form>

        {proposal && (
          <div ref={resultRef}>
            <ProposalBreakdown proposal={proposal} />
          </div>
        )}
      </div>
    </ResponsiveDrawer>
  );
}

function ProposalBreakdown({ proposal }: { proposal: IncomeDistributionProposal }) {
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
      <h3 className="text-sm font-bold text-foreground">Regla 50/30/20 y cobertura de préstamos</h3>

      {/* Stacked overview bar; the numbers below carry the data. */}
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
