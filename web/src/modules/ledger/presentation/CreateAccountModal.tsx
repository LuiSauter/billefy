"use client";

import React, { useEffect, useState } from "react";
import { AccountType, CreateAccountRequest } from "@/modules/ledger/domain/ledger.types";
import {
  ACCOUNT_ICON_CHOICES,
  ACCOUNT_TYPE_OPTIONS,
  getDefaultAccountVisualMeta,
} from "@/modules/ledger/domain/account-meta";
import {
  CATEGORY_COLOR_LIST,
  CategoryColorKey,
  CategoryIconKey,
} from "@/modules/ledger/domain/category.types";
import { CategoryIcon, CategoryIconBadge } from "./CategoryIcon";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { currencyChipLabel, normalizeAmountString } from "@/shared/lib/keypad";
import { Amount } from "@/shared/ui/amount";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: CreateAccountRequest) => Promise<void>;
  defaultCurrency?: string;
}

const FORM_ID = "create-account-form";

const CURRENCY_OPTIONS = [
  { value: "BOB", label: "BOB" },
  { value: "USD", label: "USD" },
  { value: "USDT", label: "USDT" },
  { value: "USDC", label: "USDC" },
];

const CURRENCY_NAMES: Record<string, string> = {
  BOB: "Bolivianos",
  USD: "Dólares",
  USDT: "Tether",
  USDC: "USD Coin",
};

export function CreateAccountModal({ isOpen, onClose, onSubmit, defaultCurrency = "BOB" }: CreateAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("Savings");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [initialBalance, setInitialBalance] = useState("");
  const [iconKey, setIconKey] = useState<CategoryIconKey>("piggy-bank");
  const [colorKey, setColorKey] = useState<CategoryColorKey>("emerald");
  const [submitting, setSubmitting] = useState(false);

  // Reset the form whenever the drawer closes or opens.
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setType("Savings");
      setCurrency(defaultCurrency);
      setInitialBalance("");
      setIconKey("piggy-bank");
      setColorKey("emerald");
    } else {
      setCurrency(defaultCurrency);
    }
  }, [isOpen, defaultCurrency]);

  const handleSelectType = (nextType: AccountType) => {
    setType(nextType);
    const defaults = getDefaultAccountVisualMeta(nextType);
    setIconKey(defaults.iconKey);
    setColorKey(defaults.colorKey);
    if (nextType === "CryptoWallet") {
      setCurrency("USDT");
    } else if (nextType === "International") {
      setCurrency("USD");
    } else if (nextType === "Cash") {
      setCurrency(defaultCurrency);
    }
  };

  const isValid = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const balance = normalizeAmountString(initialBalance.trim());

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        currency,
        initialBalance: balance ? balance : 0,
        iconKey,
        colorKey,
      });
      setName("");
      setInitialBalance("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Crear nueva cuenta"
      description="Elegí el tipo de cuenta, su ícono personalizado, moneda y saldo inicial."
      size="lg"
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
            {submitting ? "Creando..." : "Crear cuenta"}
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
        {/* Live Preview */}
        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <CategoryIconBadge iconKey={iconKey} colorKey={colorKey} size="lg" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-extrabold text-foreground truncate">
                {name.trim() || "Nombre de tu cuenta"}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {ACCOUNT_TYPE_OPTIONS.find((o) => o.value === type)?.label || "Ahorros"} •{" "}
                {CURRENCY_NAMES[currency] ?? currency} ({currency})
              </span>
            </div>
          </div>
          <Amount value={initialBalance.trim() || "0"} currency={currency} size="sm" className="shrink-0 text-primary" />
        </div>

        {/* Account Type Cards */}
        <FormField label="Tipo de cuenta" required>
          {() => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACCOUNT_TYPE_OPTIONS.map((opt) => {
                const active = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectType(opt.value)}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                      active
                        ? "bg-accent border-primary ring-1 ring-primary/40"
                        : "bg-background border-border hover:bg-muted/60"
                    }`}
                  >
                    <CategoryIconBadge
                      iconKey={opt.defaultIcon}
                      colorKey={opt.defaultColor}
                      size="sm"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-extrabold text-foreground">
                        {opt.label}
                      </span>
                      <span className="text-xs text-muted-foreground leading-tight mt-0.5">
                        {opt.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </FormField>

        <FormField label="Nombre de la cuenta" required>
          {(control) => (
            <Input
              {...control}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Billetera física, Caja de Ahorros BNB, Binance USDT, Wise USD"
              autoComplete="off"
            />
          )}
        </FormField>

        {/* Icon & Color Customizer */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Ícono y color de la cuenta
            </span>
            <div className="flex items-center gap-1.5">
              {CATEGORY_COLOR_LIST.slice(0, 7).map((c) => {
                const isSelected = colorKey === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColorKey(c.key)}
                    title={c.label}
                    className={`w-5 h-5 rounded-full transition ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                        : "opacity-75 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.swatchHex }}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {ACCOUNT_ICON_CHOICES.map((item) => {
              const selected = iconKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setIconKey(item.key)}
                  title={item.label}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                    selected
                      ? "bg-accent border-primary text-primary ring-1 ring-primary/40"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <CategoryIcon iconKey={item.key} className="w-4 h-4" />
                  <span className="text-xs font-semibold truncate w-full text-center">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <FormField label="Moneda" hint={`${CURRENCY_NAMES[currency] ?? currency} (${currency})`}>
          <SegmentedControl
            aria-label="Moneda"
            fullWidth
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={setCurrency}
          />
        </FormField>

        <FormField label="Saldo inicial" hint="Opcional. Si lo dejás vacío, la cuenta arranca en 0.">
          {(control) => (
            <MoneyInput
              {...control}
              currency={currencyChipLabel(currency)}
              value={initialBalance}
              onValueChange={setInitialBalance}
            />
          )}
        </FormField>
      </form>
    </ResponsiveDrawer>
  );
}
