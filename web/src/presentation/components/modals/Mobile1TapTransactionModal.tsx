"use client";

import React, { useEffect, useRef, useState } from "react";
import Decimal from "decimal.js";
import { Delete } from "lucide-react";
import { cn } from "cn";
import { AccountDto, RegisterTransactionRequest, TransactionDirection } from "@/domain/models/types";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { MoneyInput } from "@/components/ui/money-input";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { isPositiveDecimal } from "@/lib/money-input";
import { KEYPAD_KEYS, applyKeypadKey, currencyChipLabel, normalizeAmountString } from "./keypad";
import { NoAccountsNotice } from "./NoAccountsNotice";

interface Mobile1TapTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountDto[];
  p2pRate: number;
  onRegister: (req: RegisterTransactionRequest) => Promise<void>;
  onOpenCreateAccount?: () => void;
}

const FORM_ID = "mobile-1tap-form";

const DIRECTION_OPTIONS = [
  { value: "Expense" as const, label: "💸 Gasto", tone: "expense" as const },
  { value: "Income" as const, label: "💰 Ingreso", tone: "income" as const },
];

const CATEGORIES = [
  "🍔 Alimentos",
  "🚗 Transporte",
  "🏠 Vivienda",
  "🎉 Ocio",
  "💊 Salud",
  "💼 Sueldo",
];

const KEY_LABELS: Record<string, string> = {
  ".": "Punto decimal",
  backspace: "Borrar último dígito",
};

type ChipOption = { value: string; label: string };

/** Radio-group of pill chips (roving tabindex + arrow keys), >= 44px tall. */
function ChipRadioGroup({
  label,
  options,
  value,
  onChange,
  scroll = false,
}: {
  label: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  scroll?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const tabbableIndex = selectedIndex === -1 ? 0 : selectedIndex;

  const move = (event: React.KeyboardEvent, index: number) => {
    const last = options.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index === last ? 0 : index + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex gap-2",
        scroll ? "-mx-1 overflow-x-auto px-1 pb-1" : "flex-wrap"
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === tabbableIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors outline-hidden focus-visible:ring-4 focus-visible:ring-ring/25",
              active
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Mobile1TapTransactionModal({
  isOpen,
  onClose,
  accounts,
  p2pRate,
  onRegister,
  onOpenCreateAccount,
}: Mobile1TapTransactionModalProps) {
  const [direction, setDirection] = useState<TransactionDirection>("Expense");
  // Decimal string; "" means nothing typed yet (displayed as 0).
  const [amountStr, setAmountStr] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || "");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [loading, setLoading] = useState(false);

  // Reset the form whenever the drawer closes.
  useEffect(() => {
    if (!isOpen) {
      setDirection("Expense");
      setAmountStr("");
      setSelectedAccountId("");
      setCategory(CATEGORIES[0]);
    }
  }, [isOpen]);

  const hasAccounts = accounts.length > 0;
  const effectiveAccountId = selectedAccountId || accounts[0]?.id || "";
  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const normalizedAmount = normalizeAmountString(amountStr);
  const isValid = isPositiveDecimal(normalizedAmount);
  const amountDecimal = new Decimal(normalizedAmount || "0");
  const isUsdt = currentAccount?.currency === "USDT";
  const bobEquiv = isUsdt ? amountDecimal.times(p2pRate) : amountDecimal;
  const usdEquiv = isUsdt ? amountDecimal : amountDecimal.div(p2pRate || 9.85);
  const currencyChip = currencyChipLabel(currentAccount?.currency);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      await onRegister({
        accountId: effectiveAccountId,
        amount: normalizedAmount,
        direction,
        categoryId: category,
        description: `1-Tap: ${category}`,
      });
      onClose();
      setAmountStr("");
    } finally {
      setLoading(false);
    }
  };

  const equivalentPill = (
    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-muted-foreground tabular-nums">
      ≈ {isUsdt ? `Bs. ${bobEquiv.toFixed(2)}` : `$${usdEquiv.toFixed(2)} USD`} (P2P Bs {p2pRate.toFixed(2)})
    </span>
  );

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Nuevo movimiento (1-Tap)"
      description="Cargá el monto, elegí cuenta y categoría, y listo."
      footer={
        hasAccounts ? (
          <>
            <Button
              type="submit"
              form={FORM_ID}
              size="lg"
              loading={loading}
              disabled={!isValid}
              className="order-1 w-full md:order-2 md:flex-1"
            >
              Confirmar en 1-Tap
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
        ) : undefined
      }
    >
      {!hasAccounts ? (
        <NoAccountsNotice
          description="Para registrar gastos o ingresos rápidos en 1-Tap, primero necesitás crear una cuenta bancaria o billetera."
          onOpenCreateAccount={
            onOpenCreateAccount
              ? () => {
                  onClose();
                  onOpenCreateAccount();
                }
              : undefined
          }
        />
      ) : (
        <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
          <SegmentedControl
            aria-label="Tipo de movimiento"
            fullWidth
            options={DIRECTION_OPTIONS}
            value={direction}
            onChange={setDirection}
          />

          {/* Mobile (< md): amount display driven by the keypad below */}
          <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-border bg-muted p-4 md:hidden">
            <div
              role="status"
              aria-label={`Monto: ${amountStr || "0"} ${currentAccount?.currency ?? ""}`}
              className="flex items-baseline gap-2 text-foreground tabular-nums"
            >
              <span className="text-2xl font-semibold text-muted-foreground">{currencyChip}</span>
              <span className="text-5xl font-bold tracking-tight">{amountStr || "0"}</span>
            </div>
            {equivalentPill}
          </div>

          {/* Desktop (>= md): keyboard-friendly input, keypad hidden */}
          <div className="hidden flex-col gap-3 md:flex">
            <FormField label="Monto" required>
              {(control) => (
                <MoneyInput
                  {...control}
                  size="lg"
                  currency={currencyChip}
                  value={amountStr}
                  onValueChange={setAmountStr}
                />
              )}
            </FormField>
            <div>{equivalentPill}</div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              Imputar a cuenta
            </span>
            <ChipRadioGroup
              scroll
              label="Imputar a cuenta"
              options={accounts.map((acc) => ({ value: acc.id, label: `${acc.name} (${acc.currency})` }))}
              value={effectiveAccountId}
              onChange={setSelectedAccountId}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground">Categoría</span>
            <ChipRadioGroup
              label="Categoría"
              options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
              value={category}
              onChange={setCategory}
            />
          </div>

          {/* Numeric keypad: mobile only */}
          <div role="group" aria-label="Teclado numérico" className="grid grid-cols-3 gap-2 select-none md:hidden">
            {KEYPAD_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-label={KEY_LABELS[key] ?? `Dígito ${key}`}
                onClick={() => setAmountStr((prev) => applyKeypadKey(prev, key))}
                className="flex h-14 items-center justify-center rounded-2xl bg-muted text-xl font-bold text-foreground tabular-nums transition outline-hidden hover:bg-secondary/80 focus-visible:ring-4 focus-visible:ring-ring/25 active:scale-95"
              >
                {key === "backspace" ? <Delete className="size-6 text-muted-foreground" aria-hidden="true" /> : key}
              </button>
            ))}
          </div>
        </form>
      )}
    </ResponsiveDrawer>
  );
}
