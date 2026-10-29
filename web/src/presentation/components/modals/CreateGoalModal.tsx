"use client";

import React, { useState } from "react";
import { AccountDto, CreateGoalRequest } from "@/domain/models/types";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";

interface CreateGoalModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  onClose: () => void;
  onSubmit: (req: CreateGoalRequest) => Promise<void>;
  p2pRate?: number;
}

const FORM_ID = "create-goal-form";

export function CreateGoalModal({
  isOpen,
  accounts,
  onClose,
  onSubmit,
  p2pRate = 9.85,
}: CreateGoalModalProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currency, setCurrency] = useState("BOB");
  const [targetDate, setTargetDate] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);

  const targetNum = parseFloat(targetAmount) || 0;
  const isCrypto = currency === "USDT" || currency === "USD";
  const bobEquivalent = isCrypto ? (targetNum * p2pRate).toFixed(2) : targetNum.toFixed(2);
  const isValid = name.trim().length > 0 && targetNum > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        targetAmount: targetNum,
        currency,
        targetDate: targetDate || undefined,
        accountId: accountId || undefined,
      });
      setName("");
      setTargetAmount("");
      setTargetDate("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title="Nuevo objetivo financiero"
      description="Establecé metas de ahorro con seguimiento de ritmo mensual."
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
            {submitting ? "Guardando..." : "Guardar meta financiera"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card"
          >
            Cancelar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField label="Nombre de la meta" required>
          {(control) => (
            <Input
              {...control}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Fondo de emergencia, Departamento, Vacaciones"
            />
          )}
        </FormField>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-foreground">Moneda</span>
          <SegmentedControl
            aria-label="Moneda de la meta"
            fullWidth
            value={currency}
            onChange={setCurrency}
            options={[
              { value: "BOB", label: "BOB (Bs.)" },
              { value: "USD", label: "USD ($)" },
              { value: "USDT", label: "USDT" },
            ]}
          />
        </div>

        <FormField label="Monto meta" required>
          {(control) => (
            <MoneyInput
              {...control}
              size="lg"
              currency={currency === "BOB" ? "Bs" : currency === "USD" ? "$" : "USDT"}
              value={targetAmount}
              onValueChange={setTargetAmount}
            />
          )}
        </FormField>

        {targetNum > 0 && isCrypto && (
          <div className="p-3 rounded-xl bg-accent text-accent-foreground text-xs font-semibold">
            ≈ Bs. {bobEquivalent} (al cambio P2P de Bs. {p2pRate.toFixed(2)})
          </div>
        )}

        <FormField label="Fecha límite" hint="Opcional. Te calcula la cuota mensual sugerida.">
          {(control) => (
            <Input
              {...control}
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          )}
        </FormField>

        <FormField label="Cuenta de ahorro asociada" hint="Opcional. Para asociar el saldo real.">
          {(control) => (
            <SelectField
              {...control}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: "", label: "Sin cuenta vinculada (Solo seguimiento)" },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  description: `${a.currency} · Saldo ${a.balance.toFixed(2)}`,
                })),
              ]}
            />
          )}
        </FormField>
      </form>
    </ResponsiveDrawer>
  );
}
