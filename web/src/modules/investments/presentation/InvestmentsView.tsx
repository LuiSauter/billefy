"use client";

import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toBob } from "@/modules/ledger/domain/monthly-analytics";
import {
  CATEGORY_COLOR_LIST,
  CategoryColorKey,
  CategoryIconKey,
} from "@/modules/ledger/domain/category.types";
import { ACCOUNT_ICON_CHOICES } from "@/modules/ledger/domain/account-meta";
import { CategoryIcon, CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { ChangeBadge } from "@/modules/ledger/presentation/AccountsSummaryCard";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { currencyChipLabel, normalizeAmountString } from "@/shared/lib/keypad";
import {
  INVESTMENT_KINDS,
  Investment,
  InvestmentKind,
  getKindLabel,
  investmentVariationPct,
  lastChangePct,
} from "../domain/investment.types";
import { InvestmentsController } from "../application/useInvestments";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { InvestmentCashModal } from "./InvestmentCashModal";

interface InvestmentsViewProps {
  controller: InvestmentsController;
  p2pRate: number;
  accounts: AccountDto[];
  onCashComplete: () => Promise<void>;
}

const CURRENCIES = [
  { value: "BOB", label: "BOB" },
  { value: "USD", label: "USD" },
  { value: "USDT", label: "USDT" },
];

const ICON_CHOICES = [
  ...ACCOUNT_ICON_CHOICES,
  { key: "home" as CategoryIconKey, label: "Inmueble" },
  { key: "laptop" as CategoryIconKey, label: "Tecnología" },
  { key: "car" as CategoryIconKey, label: "Vehículo" },
  { key: "gift" as CategoryIconKey, label: "Colección" },
];

function toNumber(raw: string): number {
  const n = parseFloat(normalizeAmountString(raw.trim()) || "0");
  return Number.isFinite(n) ? n : 0;
}

function CreateInvestmentDrawer({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: InvestmentsController["createInvestment"];
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<InvestmentKind>("crypto");
  const [iconKey, setIconKey] = useState<CategoryIconKey>("coins");
  const [colorKey, setColorKey] = useState<CategoryColorKey>("amber");
  const [currency, setCurrency] = useState("USD");
  const [quantity, setQuantity] = useState("");
  const [value, setValue] = useState("");

  const valid = name.trim().length > 0 && toNumber(value) > 0 && toNumber(quantity) > 0;

  const pickKind = (k: InvestmentKind) => {
    setKind(k);
    const def = INVESTMENT_KINDS.find((i) => i.value === k);
    if (def) {
      setIconKey(def.icon);
      setColorKey(def.color);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onCreate({
      name,
      kind,
      iconKey,
      colorKey,
      currency,
      quantity: toNumber(quantity),
      currentValue: toNumber(value),
    });
    setName("");
    setQuantity("");
    setValue("");
    onClose();
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Nueva inversión o activo"
      description="Registrá el activo; la variación se calcula sola al actualizar su valor."
      size="md"
      footer={
        <Button type="submit" form="create-investment-form" size="lg" disabled={!valid} className="w-full">
          Guardar activo
        </Button>
      }
    >
      <form id="create-investment-form" onSubmit={submit} className="flex flex-col gap-5">
        <FormField label="Tipo de activo">
          {() => (
            <div className="flex flex-wrap gap-2">
              {INVESTMENT_KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => pickKind(k.value)}
                  className={`px-3 h-8 rounded-full border text-xs font-bold transition ${
                    kind === k.value
                      ? "bg-accent border-primary text-foreground"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          )}
        </FormField>

        <FormField label="Nombre del activo" required>
          {(control) => (
            <Input
              {...control}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Bitcoin, ETF S&P 500, Departamento"
              autoComplete="off"
            />
          )}
        </FormField>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Ícono y color</span>
            <div className="flex items-center gap-1.5">
              {CATEGORY_COLOR_LIST.slice(0, 7).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  onClick={() => setColorKey(c.key)}
                  className={`w-5 h-5 rounded-full transition ${
                    colorKey === c.key
                      ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                      : "opacity-75 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.swatchHex }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {ICON_CHOICES.map((item) => (
              <button
                key={item.key}
                type="button"
                title={item.label}
                onClick={() => setIconKey(item.key)}
                className={`p-2 rounded-xl border flex items-center justify-center transition ${
                  iconKey === item.key
                    ? "bg-accent border-primary text-primary ring-1 ring-primary/40"
                    : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <CategoryIcon iconKey={item.key} className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        <FormField label="Moneda">
          <SegmentedControl
            aria-label="Moneda"
            fullWidth
            options={CURRENCIES}
            value={currency}
            onChange={setCurrency}
          />
        </FormField>

        <FormField label="Cantidad" required hint="Unidades, tokens, acciones o m².">
          {(control) => (
            <Input
              {...control}
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.5"
            />
          )}
        </FormField>

        <FormField label="Valor actual total" required hint="Valor de toda la posición hoy.">
          {(control) => (
            <MoneyInput
              {...control}
              currency={currencyChipLabel(currency)}
              value={value}
              onValueChange={setValue}
            />
          )}
        </FormField>
      </form>
    </ResponsiveDrawer>
  );
}

function UpdateValueDrawer({
  investment,
  onClose,
  onUpdate,
  onDelete,
}: {
  investment: Investment | null;
  onClose: () => void;
  onUpdate: InvestmentsController["updateInvestmentValue"];
  onDelete: InvestmentsController["deleteInvestment"];
}) {
  const [value, setValue] = useState("");
  const [quantity, setQuantity] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => {
    if (investment) {
      setValue(String(investment.currentValue));
      setQuantity(String(investment.quantity));
      setConfirmDelete(false);
    }
  }, [investment]);

  if (!investment) return null;

  const newValue = toNumber(value);
  const preview =
    investment.currentValue > 0
      ? ((newValue - investment.currentValue) / investment.currentValue) * 100
      : null;

  return (
    <ResponsiveDrawer
      open={!!investment}
      onOpenChange={(o) => !o && onClose()}
      title={`Actualizar ${investment.name}`}
      description="Subí o bajá el valor actual: la variación se recalcula automáticamente."
      size="md"
      footer={
        <Button
          type="button"
          size="lg"
          disabled={newValue <= 0}
          className="w-full"
          onClick={() => {
            onUpdate(investment.id, newValue, toNumber(quantity) || undefined);
            onClose();
          }}
        >
          Guardar valor
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <FormField label="Nuevo valor actual total">
          {(control) => (
            <MoneyInput
              {...control}
              currency={currencyChipLabel(investment.currency)}
              value={value}
              onValueChange={setValue}
            />
          )}
        </FormField>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Cambio frente al valor actual</span>
          <ChangeBadge pct={newValue > 0 ? preview : null} />
        </div>
        <FormField label="Cantidad">
          {(control) => (
            <Input
              {...control}
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          )}
        </FormField>

        <div className="pt-2 border-t border-border">
          {confirmDelete ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                ¿Archivar «{investment.name}»? El historial de efectivo se conserva; archivar no es un retiro.
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  No
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onDelete(investment.id);
                    onClose();
                  }}
                >
                  Sí, archivar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" /> Archivar activo
            </button>
          )}
        </div>
      </div>
    </ResponsiveDrawer>
  );
}

export function InvestmentsView({ controller, p2pRate, accounts, onCashComplete }: InvestmentsViewProps) {
  const { investments, createInvestment, updateInvestmentValue, deleteInvestment } = controller;
  const [createOpen, setCreateOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);

  const totalValue = investments.reduce(
    (a, i) => a + toBob(i.currentValue, i.currency, p2pRate),
    0
  );
  const totalCost = investments.reduce(
    (a, i) => a + toBob(i.initialValue, i.currency, p2pRate),
    0
  );
  const totalPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-black text-foreground tracking-tight">
            Inversiones y activos
          </h1>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            Patrimonio total:{" "}
            <span className="font-mono font-bold text-foreground">
              Bs {Math.round(totalValue).toLocaleString("en-US")}
            </span>{" "}
            <ChangeBadge pct={totalPct} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setCashOpen(true)}>Registrar aporte o retiro</Button>
          <Button type="button" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Nuevo activo
          </Button>
        </div>
      </div>

      {investments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Aún no registraste inversiones. Empezá con tu primer activo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investments.map((inv) => {
            const sinceStart = investmentVariationPct(inv);
            const last = lastChangePct(inv);
            return (
              <div
                key={inv.id}
                className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIconBadge iconKey={inv.iconKey} colorKey={inv.colorKey} size="lg" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-extrabold text-foreground truncate">
                        {inv.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {getKindLabel(inv.kind)} • {inv.quantity.toLocaleString("en-US")} u.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(inv)}
                    title="Actualizar valor"
                    className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground">Valor actual</span>
                    <span className="text-lg font-black font-mono text-foreground">
                      {inv.currentValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                      {inv.currency}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <ChangeBadge pct={sinceStart} />
                    <span className="text-[10px] text-muted-foreground">
                      desde el inicio
                      {last !== null ? ` • último: ${last >= 0 ? "+" : ""}${last.toFixed(1)}%` : ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InvestmentCashModal open={cashOpen} onClose={() => setCashOpen(false)} controller={controller} accounts={accounts} onComplete={onCashComplete} />
      <CreateInvestmentDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createInvestment}
      />
      <UpdateValueDrawer
        investment={editing}
        onClose={() => setEditing(null)}
        onUpdate={updateInvestmentValue}
        onDelete={deleteInvestment}
      />
    </div>
  );
}
