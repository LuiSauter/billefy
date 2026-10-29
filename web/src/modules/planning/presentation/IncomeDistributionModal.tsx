"use client";

import React, { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import {
  IncomeDistributionProposal,
  ProposeIncomeDistributionRequest,
} from "@/modules/planning/domain/planning.types";
import { ProposalBreakdown } from "@/modules/planning/presentation/ProposalBreakdown";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { isPositiveDecimal } from "@/shared/lib/money-input";
import { currencyChipLabel, normalizeAmountString } from "@/shared/lib/keypad";

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

  useEffect(() => {
    if (!isOpen) {
      setIncomeAmount("");
      setCurrency("BOB");
      setProposal(null);
      setError(undefined);
    }
  }, [isOpen]);

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
