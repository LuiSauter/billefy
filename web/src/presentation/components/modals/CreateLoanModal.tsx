"use client";

import React, { useState } from "react";
import {
  AccountDto,
  CreateLoanRequest,
  LoanScheduleDto,
  LoanTemplate,
  SimulateLoanRequest,
} from "@/domain/models/types";
import { Button } from "@/components/ui/button";
import { FormField, FormGrid } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { notify } from "@/lib/notify";

interface CreateLoanModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  onClose: () => void;
  onSimulate: (req: SimulateLoanRequest) => Promise<LoanScheduleDto>;
  onSubmit: (req: CreateLoanRequest) => Promise<void>;
}

const FORM_ID = "create-loan-form";

export function CreateLoanModal({
  isOpen,
  accounts,
  onClose,
  onSimulate,
  onSubmit,
}: CreateLoanModalProps) {
  const [counterparty, setCounterparty] = useState("");
  const [type, setType] = useState<"Lent" | "Borrowed">("Lent");
  const [template, setTemplate] = useState<LoanTemplate>("FixedInstallment");
  const [principal, setPrincipal] = useState("");
  const [currency, setCurrency] = useState("BOB");
  const [rate, setRate] = useState("0.02");
  const [installments, setInstallments] = useState("12");
  const [disbursementAcc, setDisbursementAcc] = useState("");
  const [simulatedSchedule, setSimulatedSchedule] = useState<LoanScheduleDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const principalNum = parseFloat(principal) || 0;
  const rateNum = parseFloat(rate) || 0;
  const installmentsNum = parseInt(installments, 10) || 0;
  const isValid = counterparty.trim().length > 0 && principalNum > 0 && installmentsNum >= 1;

  const handleSimulate = async () => {
    if (principalNum <= 0 || installmentsNum < 1) return;

    setSimulating(true);
    try {
      const schedule = await onSimulate({
        principal: principalNum,
        rate: isNaN(rateNum) ? 0 : rateNum,
        template,
        totalInstallments: installmentsNum,
      });
      setSimulatedSchedule(schedule);
      notify.success("Cronograma calculado", `TEA estimada: ${(schedule.annualEffectiveRate * 100).toFixed(2)}%`);
    } catch (err: unknown) {
      notify.error("Error al simular el cronograma", err);
    } finally {
      setSimulating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      await onSubmit({
        counterpartyName: counterparty.trim(),
        type,
        template,
        principal: principalNum,
        currency,
        interestRate: isNaN(rateNum) ? 0 : rateNum,
        rateUnit: "NominalMonthly",
        totalInstallments: installmentsNum,
        frequency: "Monthly",
        disbursementAccountId: disbursementAcc || undefined,
      });
      notify.success("Préstamo registrado", `Registrado para ${counterparty.trim()}`);
      setPrincipal("");
      setRate("0.02");
      setInstallments("12");
      setCounterparty("");
      setSimulatedSchedule(null);
      onClose();
    } catch (err: unknown) {
      notify.error("Error al crear el préstamo", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="xl"
      title="Simular / Registrar préstamo"
      description="Calculá la amortización exacta y registralo en tu libro de préstamos."
      footer={
        <>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            loading={submitting}
            disabled={!isValid}
            className="order-1 w-full md:order-3 md:w-auto"
          >
            {submitting ? "Creando..." : "Crear préstamo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            loading={simulating}
            disabled={principalNum <= 0 || installmentsNum < 1}
            onClick={handleSimulate}
            className="order-2 w-full md:order-2 md:w-auto"
          >
            Simular cronograma
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="order-3 w-full md:order-1 md:w-auto md:border-input md:bg-card"
          >
            Cancelar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Operation type */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-foreground">Tipo de operación</span>
          <SegmentedControl
            aria-label="Tipo de operación"
            fullWidth
            value={type}
            onChange={(v) => setType(v as "Lent" | "Borrowed")}
            options={[
              { value: "Lent", label: "Dinero prestado (A mi favor)", tone: "income" },
              { value: "Borrowed", label: "Deuda contraída (Por pagar)", tone: "expense" },
            ]}
          />
        </div>

        <FormGrid>
          <FormField label="Contraparte (Persona o Entidad)" required>
            {(control) => (
              <Input
                {...control}
                type="text"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="Ej. Juan Pérez, Banco BCP"
              />
            )}
          </FormField>

          <FormField label="Sistema de amortización">
            {(control) => (
              <SelectField
                {...control}
                value={template}
                onChange={(e) => setTemplate(e.target.value as LoanTemplate)}
                options={[
                  { value: "FixedInstallment", label: "Francés (Cuota Fija)" },
                  { value: "Decreasing", label: "Alemán (Capital Fijo)" },
                  { value: "American", label: "Americano (Interés Periódico)" },
                  { value: "SingleEnd", label: "Bullet (Pago Único al Vencer)" },
                ]}
              />
            )}
          </FormField>
        </FormGrid>

        <FormGrid>
          <FormField label="Capital principal" required>
            {(control) => (
              <MoneyInput
                {...control}
                size="lg"
                currency={currency === "BOB" ? "Bs" : currency === "USD" ? "$" : "USDT"}
                value={principal}
                onValueChange={setPrincipal}
              />
            )}
          </FormField>

          <FormField label="Moneda">
            {(control) => (
              <SelectField
                {...control}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: "BOB", label: "Bolivianos (BOB)" },
                  { value: "USD", label: "Dólares (USD)" },
                  { value: "USDT", label: "Tether (USDT)" },
                ]}
              />
            )}
          </FormField>
        </FormGrid>

        <FormGrid>
          <FormField label="Tasa mensual nominal" hint="Ej: 0.02 equivale al 2% mensual" required>
            {(control) => (
              <Input
                {...control}
                type="number"
                step="0.0001"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.02"
              />
            )}
          </FormField>

          <FormField label="Número de cuotas" required>
            {(control) => (
              <Input
                {...control}
                type="number"
                min="1"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                placeholder="12"
              />
            )}
          </FormField>
        </FormGrid>

        <FormField label="Cuenta de desembolso" hint="Opcional. Registra el débito/crédito en una cuenta real.">
          {(control) => (
            <SelectField
              {...control}
              value={disbursementAcc}
              onChange={(e) => setDisbursementAcc(e.target.value)}
              options={[
                { value: "", label: "(Sin desembolso en cuenta bancaria)" },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  description: `${a.currency} · Saldo ${a.balance.toFixed(2)}`,
                })),
              ]}
            />
          )}
        </FormField>

        {simulatedSchedule && (
          <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">TEA</span>
                <strong className="text-base font-extrabold text-foreground tabular-nums">
                  {(simulatedSchedule.annualEffectiveRate * 100).toFixed(2)}%
                </strong>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Total Intereses</span>
                <strong className="text-base font-extrabold text-foreground tabular-nums">
                  {simulatedSchedule.totalInterest.toFixed(2)} {currency}
                </strong>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Costo Total</span>
                <strong className="text-base font-extrabold text-primary tabular-nums">
                  {simulatedSchedule.totalToPay.toFixed(2)} {currency}
                </strong>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border text-xs bg-card">
              <div className="grid grid-cols-5 font-bold py-2 px-3 bg-muted text-muted-foreground sticky top-0">
                <span>Cuota</span>
                <span>Vence</span>
                <span>Capital</span>
                <span>Interés</span>
                <span>Total</span>
              </div>
              {simulatedSchedule.installments.map((inst) => (
                <div key={inst.number} className="grid grid-cols-5 py-2 px-3 items-center font-mono">
                  <span className="font-sans font-semibold">#{inst.number}</span>
                  <span>{inst.dueDate}</span>
                  <span>{inst.principal.toFixed(2)}</span>
                  <span>{inst.interest.toFixed(2)}</span>
                  <span className="font-bold text-foreground">{inst.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </ResponsiveDrawer>
  );
}
