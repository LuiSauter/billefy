"use client";

import React, { useState, useEffect } from "react";
import Decimal from "decimal.js";
import { Check, Calendar } from "lucide-react";
import { RecurringPaymentDto } from "../domain/planning.types";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";

interface ConfirmRecurringPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RecurringPaymentDto | null;
  accounts: AccountDto[];
  onConfirm: (
    id: string,
    req: { accountId: string; amount: number; description?: string }
  ) => Promise<unknown>;
}

const FORM_ID = "confirm-recurring-payment-form";

export function ConfirmRecurringPaymentModal({
  isOpen,
  onClose,
  item,
  accounts,
  onConfirm,
}: ConfirmRecurringPaymentModalProps) {
  const { findCategory } = useUserCategories();

  const [accountId, setAccountId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setAmount(String(item.amount));
      setDescription(`Pago programado: ${item.name}`);
      // Find matching default account or first account in matching currency
      const defaultAcc = accounts.find((a) => a.id === item.defaultAccountId);
      if (defaultAcc) {
        setAccountId(defaultAcc.id);
      } else {
        const matchingCurrAcc = accounts.find((a) => a.currency === item.currency);
        setAccountId(matchingCurrAcc ? matchingCurrAcc.id : accounts[0]?.id ?? "");
      }
    }
    setError(null);
  }, [item, accounts, isOpen]);

  if (!item) return null;

  const category = findCategory(item.categoryId ?? "");

  let parsedDecimal: Decimal;
  try {
    parsedDecimal = new Decimal(amount || "0");
  } catch {
    parsedDecimal = new Decimal(0);
  }
  const isAmountValid = parsedDecimal.isFinite() && parsedDecimal.gt(0);
  const isFormValid = accountId.length > 0 && isAmountValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(item.id, {
        accountId,
        amount: parsedDecimal.toNumber(),
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al confirmar pago");
    } finally {
      setSubmitting(false);
    }
  };

  const currencySymbol = item.currency === "BOB" ? "Bs" : item.currency === "USD" ? "$" : item.currency;
  const formattedAmount = `${currencySymbol} ${parsedDecimal.toFixed(2)}`;

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title={`Aceptar pago: ${item.name}`}
      description="Asentará el movimiento real en el Libro Diario y avanzará la programación al siguiente ciclo."
      footer={
        <>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            loading={submitting}
            disabled={!isFormValid}
            className="order-1 w-full md:order-2 md:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            <Check className="w-4 h-4 mr-1.5" />
            <span>Confirmar pago {formattedAmount} (1-Clic)</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="order-2 w-full md:order-1 md:w-auto"
          >
            Cancelar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Resumen del compromiso programado */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {category ? (
              <CategoryIconBadge
                iconKey={category.iconKey}
                colorKey={category.colorKey}
                size="md"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                {item.name.charAt(0)}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-foreground">{item.name}</span>
              <span className="text-xs text-muted-foreground">
                {category?.name ?? "General"} • {item.frequency}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {item.nextDueDate}
            </span>
            {item.isOverdue && (
              <span className="text-[11px] font-bold text-rose-400">Vencido</span>
            )}
          </div>
        </div>

        {/* Cuenta de débito / depósito */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Cuenta de {item.flowType === "Expense" ? "débito" : "depósito"} <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {accounts.map((acc) => {
              const isSelected = acc.id === accountId;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1 ${
                    isSelected
                      ? "bg-emerald-600/15 border-emerald-500 text-foreground ring-2 ring-emerald-500/30"
                      : "bg-card border-border text-foreground hover:bg-muted/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold truncate">{acc.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>{acc.currency}</span>
                    <span className="font-semibold text-foreground">{acc.balance.toFixed(2)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Monto a aplicar (ajustable) */}
        <FormField
          label="Monto a aplicar"
          required
          hint="Puedes ajustar el valor real si la factura o tarifa varió este mes."
        >
          {(control) => (
            <MoneyInput
              {...control}
              size="lg"
              currency={currencySymbol}
              value={amount}
              onValueChange={setAmount}
            />
          )}
        </FormField>

        {/* Detalle / Glosa */}
        <FormField label="Detalle / Glosa de la transacción">
          {(control) => (
            <Input
              {...control}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Pago de servicio mensual"
            />
          )}
        </FormField>
      </form>
    </ResponsiveDrawer>
  );
}
