"use client";

import React, { useEffect, useState } from "react";
import Decimal from "decimal.js";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  AccountDto,
  RegisterTransactionRequest,
  TransactionDirection,
  encodeTransactionText,
} from "@/modules/ledger/domain/ledger.types";
import {
  useUserCategories,
  isValidUuid,
} from "@/modules/ledger/application/CategoriesContext";
import {
  useTransactionFormDraft,
  combineDateAndTimeToIso,
  getLocalDateString,
  getLocalTimeString,
} from "@/modules/ledger/application/useTransactionFormDraft";
import { CategoryPickerField } from "./CategoryPickerField";
import { CategoryCreatorView } from "./CategoryCreatorView";
import { CategoryIconBadge } from "./CategoryIcon";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { isPositiveDecimal } from "@/shared/lib/money-input";
import { currencyChipLabel, normalizeAmountString } from "@/shared/lib/keypad";
import { NoAccountsNotice } from "@/shared/ui/no-accounts-notice";
import { Amount } from "@/shared/ui/amount";
import { useNumberFormat, useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText } from "@/shared/lib/amount-format";
import { formatCurrencyLabel } from "@/shared/lib/currency";

interface RegisterTransactionModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  defaultAccountId: string;
  p2pRate?: number;
  onClose: () => void;
  onSubmit: (req: RegisterTransactionRequest) => Promise<void>;
  onOpenCreateAccount?: () => void;
}

const TXN_STEP1_FORM_ID = "register-transaction-step1-form";
const TXN_STEP3_FORM_ID = "register-transaction-step3-form";
const CAT_FORM_ID = "register-category-inline-form";

const DIRECTION_OPTIONS = [
  { value: "Expense" as const, label: "Gasto", tone: "expense" as const },
  { value: "Income" as const, label: "Ingreso", tone: "income" as const },
];

const QUICK_TITLES: Record<TransactionDirection, string[]> = {
  Expense: ["Almuerzo", "Supermercado", "Transporte", "Cena", "Servicios", "Farmacia"],
  Income: ["Sueldo", "Pago cliente", "Honorarios", "Venta", "Reembolso", "Transferencia"],
};

export function RegisterTransactionModal({
  isOpen,
  accounts,
  defaultAccountId,
  p2pRate = 9.85,
  onClose,
  onSubmit,
  onOpenCreateAccount,
}: RegisterTransactionModalProps) {
  const { findCategory } = useUserCategories();
  const formatNumber = useNumberFormat();
  const numberPreferences = useNumberPreferences();
  const { draft, updateDraft, clearDraft, hasUnsavedChanges } =
    useTransactionFormDraft(defaultAccountId || (accounts[0]?.id ?? ""));

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCategoryFormValid, setIsCategoryFormValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsCreatingCategory(false);
    }
  }, [isOpen]);

  const {
    step,
    direction,
    title,
    selectedCategoryId,
    amount,
    accountId,
    useNow,
    customDate,
    customTime,
  } = draft;

  const selectedCategory = findCategory(selectedCategoryId) || null;
  const isTitleValid = title.trim().length > 0;
  const isCategoryValid = selectedCategory !== null;

  // Ensure current step is valid relative to completed prerequisites
  const effectiveStep: 1 | 2 | 3 = !isTitleValid
    ? 1
    : step === 3 && !isCategoryValid
    ? 2
    : step;

  const handleDirectionChange = (nextDirection: TransactionDirection) => {
    const keepCategory =
      selectedCategory &&
      selectedCategory.direction.toLowerCase() === nextDirection.toLowerCase();
    updateDraft({
      direction: nextDirection,
      selectedCategoryId: keepCategory ? selectedCategoryId : "",
      step: !keepCategory && effectiveStep === 3 ? 2 : effectiveStep,
    });
  };

  const effectiveAccountId = accounts.some((a) => a.id === accountId)
    ? accountId
    : defaultAccountId || accounts[0]?.id || "";
  const selectedAccount = accounts.find((a) => a.id === effectiveAccountId);
  const normalizedAmount = normalizeAmountString(amount);
  const isAmountValid = isPositiveDecimal(normalizedAmount);
  const amountError =
    amount !== "" && !isAmountValid ? "Ingresá un monto mayor a 0." : undefined;

  const amountDecimal = new Decimal(isAmountValid ? normalizedAmount : "0");
  const isUsdAccount =
    selectedAccount?.currency === "USD" || selectedAccount?.currency === "USDT";
  const rateLabel = `${formatCurrencyLabel("BOB")} ${formatNumber(p2pRate)}`;
  const equivText = isAmountValid
    ? isUsdAccount
      ? `≈ ${formatAmountText(amountDecimal.times(p2pRate), "BOB", numberPreferences)} (P2P ${rateLabel})`
      : `≈ ${formatAmountText(amountDecimal.div(p2pRate || 9.85), "USD", numberPreferences)} (P2P ${rateLabel})`
    : null;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTitleValid) return;
    updateDraft({ step: 2 });
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTitleValid || !isCategoryValid || !isAmountValid) return;

    setSubmitting(true);
    try {
      const occurredAt = useNow
        ? new Date().toISOString()
        : combineDateAndTimeToIso(customDate, customTime);

      const finalDescription = encodeTransactionText(
        title.trim() || selectedCategory.name,
        ""
      );

      await onSubmit({
        accountId: effectiveAccountId,
        amount: normalizedAmount,
        direction,
        categoryId: isValidUuid(selectedCategory.id)
          ? selectedCategory.id
          : undefined,
        description: finalDescription,
        occurredAt,
      });
      clearDraft();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const hasAccounts = accounts.length > 0;
  const directionLabel = direction === "Expense" ? "gasto" : "ingreso";

  const renderFooter = () => {
    if (!hasAccounts) return undefined;

    if (isCreatingCategory) {
      return (
        <>
          <Button
            type="submit"
            form={CAT_FORM_ID}
            size="lg"
            disabled={!isCategoryFormValid}
            className="order-1 w-full md:order-2 md:flex-1"
          >
            Crear y continuar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setIsCreatingCategory(false)}
            className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a galería
          </Button>
        </>
      );
    }

    if (effectiveStep === 1) {
      return (
        <>
          <Button
            type="submit"
            form={TXN_STEP1_FORM_ID}
            size="lg"
            disabled={!isTitleValid}
            className="order-1 w-full md:order-2 md:flex-1 gap-2"
          >
            <span>Siguiente: Categoría</span>
            <ArrowRight className="w-4 h-4" />
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
      );
    }

    if (effectiveStep === 2) {
      return (
        <>
          <Button
            type="button"
            size="lg"
            disabled={!isCategoryValid}
            onClick={() => updateDraft({ step: 3 })}
            className="order-1 w-full md:order-2 md:flex-1 gap-2"
          >
            <span>Siguiente: Monto y cuenta</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => updateDraft({ step: 1 })}
            className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          type="submit"
          form={TXN_STEP3_FORM_ID}
          size="lg"
          loading={submitting}
          disabled={!isAmountValid}
          className="order-1 w-full md:order-2 md:flex-1"
        >
          {submitting ? "Guardando..." : "Guardar movimiento"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => updateDraft({ step: 2 })}
          className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Atrás
        </Button>
      </>
    );
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={
        isCreatingCategory
          ? `Nueva categoría de ${directionLabel}`
          : "Registrar movimiento"
      }
      size="lg"
      description={
        isCreatingCategory
          ? "Elegí un nombre, color de fondo e ícono para tu categoría."
          : `Paso ${effectiveStep} de 3 · Tu avance se guarda automáticamente.`
      }
      footer={renderFooter()}
    >
      {!hasAccounts ? (
        <NoAccountsNotice
          description="Para registrar ingresos o gastos en el libro mayor inmutable, primero debés registrar tu primera cuenta."
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
        <div className="flex flex-col gap-5">
          {/* Shared Top Tab: Expense vs Income */}
          <SegmentedControl
            aria-label="Tipo de movimiento"
            fullWidth
            options={DIRECTION_OPTIONS}
            value={direction}
            onChange={handleDirectionChange}
          />

          {isCreatingCategory ? (
            <CategoryCreatorView
              formId={CAT_FORM_ID}
              direction={direction}
              onCancel={() => setIsCreatingCategory(false)}
              onValidityChange={setIsCategoryFormValid}
              onCreated={(created) => {
                updateDraft({
                  selectedCategoryId: created.id,
                  step: 3,
                });
                setIsCreatingCategory(false);
              }}
            />
          ) : (
            <div className="flex flex-col gap-5">
              {/* Interactive 3-Step Progress Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="grid grid-cols-3 gap-2 flex-1">
                  {[
                    {
                      num: 1 as const,
                      label: "1. Título",
                      done: isTitleValid,
                      enabled: true,
                    },
                    {
                      num: 2 as const,
                      label: "2. Categoría",
                      done: isCategoryValid,
                      enabled: isTitleValid,
                    },
                    {
                      num: 3 as const,
                      label: "3. Monto y cuenta",
                      done: isAmountValid,
                      enabled: isTitleValid && isCategoryValid,
                    },
                  ].map((s) => {
                    const isCurrent = effectiveStep === s.num;
                    return (
                      <button
                        key={s.num}
                        type="button"
                        disabled={!s.enabled}
                        onClick={() => updateDraft({ step: s.num })}
                        className={`px-2.5 py-2 rounded-xl border text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                          isCurrent
                            ? "bg-primary/15 border-primary text-primary ring-2 ring-primary/30"
                            : s.done
                            ? "bg-card border-border text-foreground hover:border-primary/40"
                            : "bg-muted/40 border-border/60 text-muted-foreground opacity-60 cursor-not-allowed"
                        }`}
                      >
                        {s.done && !isCurrent && (
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        <span className="truncate">{s.label}</span>
                      </button>
                    );
                  })}
                </div>

                {hasUnsavedChanges && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    onClick={clearDraft}
                    aria-label="Reiniciar formulario"
                    title="Reiniciar formulario"
                    className="shrink-0 text-muted-foreground hover:text-destructive hover:border-destructive/40"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                )}
              </div>

              {/* STEP 1: Movement Title */}
              {effectiveStep === 1 && (
                <form
                  id={TXN_STEP1_FORM_ID}
                  onSubmit={handleStep1Submit}
                  className="flex flex-col gap-4 animate-in fade-in duration-150"
                >
                  <FormField
                    label={`¿Cuál es el título de este ${directionLabel}?`}
                    required
                    hint="Escribí un nombre corto y presioná Enter o tocá una sugerencia rápida."
                  >
                    {(control) => (
                      <Input
                        {...control}
                        type="text"
                        autoFocus
                        value={title}
                        onChange={(e) => updateDraft({ title: e.target.value })}
                        placeholder={
                          direction === "Expense"
                            ? "Ej. Almuerzo con amigos, Supermercado, Taxi..."
                            : "Ej. Sueldo mensual, Pago de cliente, Venta..."
                        }
                      />
                    )}
                  </FormField>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-muted-foreground">
                      Sugerencias rápidas (1 clic para avanzar):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TITLES[direction].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() =>
                            updateDraft({ title: suggestion, step: 2 })
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                            title.trim().toLowerCase() ===
                            suggestion.toLowerCase()
                              ? "bg-primary/15 border-primary text-primary"
                              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              )}

              {/* STEP 2: Category Gallery */}
              {effectiveStep === 2 && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                  {/* Step 1 Summary Pill */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Título del {directionLabel}
                      </span>
                      <span className="text-sm font-extrabold text-foreground truncate">
                        {title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateDraft({ step: 1 })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition shrink-0"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Cambiar</span>
                    </button>
                  </div>

                  <CategoryPickerField
                    direction={direction}
                    selectedCategoryId={selectedCategory?.id || ""}
                    onSelectCategory={(cat) => {
                      if (cat) {
                        updateDraft({
                          selectedCategoryId: cat.id,
                          step: 3,
                        });
                      } else {
                        updateDraft({ selectedCategoryId: "" });
                      }
                    }}
                    onRequestCreateCategory={() => setIsCreatingCategory(true)}
                  />
                </div>
              )}

              {/* STEP 3: Amount, Account, and Date/Time */}
              {effectiveStep === 3 && (
                <form
                  id={TXN_STEP3_FORM_ID}
                  onSubmit={handleFinalSubmit}
                  className="flex flex-col gap-5 animate-in fade-in duration-150"
                >
                  {/* Summary Pills for Title & Selected Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => updateDraft({ step: 1 })}
                      className="p-3 rounded-2xl bg-muted/40 border border-border hover:border-primary/40 flex items-center justify-between gap-2 text-left transition"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Título
                        </span>
                        <span className="text-xs font-extrabold text-foreground truncate">
                          {title}
                        </span>
                      </div>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>

                    {selectedCategory && (
                      <button
                        type="button"
                        onClick={() => updateDraft({ step: 2 })}
                        className="p-2.5 rounded-2xl bg-muted/40 border border-border hover:border-primary/40 flex items-center justify-between gap-2 text-left transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CategoryIconBadge
                            iconKey={selectedCategory.iconKey}
                            colorKey={selectedCategory.colorKey}
                            size="sm"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Categoría
                            </span>
                            <span className="text-xs font-extrabold text-foreground truncate">
                              {selectedCategory.name}
                            </span>
                          </div>
                        </div>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </button>
                    )}
                  </div>

                  {/* Amount Input */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold text-foreground">
                      Monto <span className="text-rose-500">*</span>
                    </span>
                    <MoneyInput
                      aria-label="Monto"
                      size="lg"
                      autoFocus
                      currency={currencyChipLabel(selectedAccount?.currency)}
                      value={amount}
                      onValueChange={(val) => updateDraft({ amount: val })}
                    />
                    {amountError && (
                      <span className="text-xs font-semibold text-rose-500 px-1">
                        {amountError}
                      </span>
                    )}
                    {equivText && !amountError && (
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums px-1">
                        {equivText}
                      </span>
                    )}
                  </div>

                  {/* Account Selector */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">
                        Seleccionar cuenta
                      </span>
                      {onOpenCreateAccount && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenCreateAccount();
                          }}
                          className="inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nueva cuenta</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {accounts.map((acc) => {
                        const isSelected = acc.id === effectiveAccountId;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => updateDraft({ accountId: acc.id })}
                            className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 ${
                              isSelected
                                ? "bg-accent border-primary text-foreground ring-2 ring-primary/30"
                                : "bg-card border-border text-foreground hover:bg-muted/70"
                            }`}
                          >
                            <span className="text-xs font-extrabold truncate">
                              {acc.name}
                            </span>
                            <Amount value={acc.balance} currency={acc.currency} size="xs" className="text-muted-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date & Time ("Hoy" Checkbox or Custom Date/Time) */}
                  <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border">
                    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={useNow}
                          onCheckedChange={(checked) => {
                            const now = new Date();
                            updateDraft({
                              useNow: Boolean(checked),
                              customDate:
                                customDate || getLocalDateString(now),
                              customTime:
                                customTime || getLocalTimeString(now),
                            });
                          }}
                        />
                        <span className="text-xs font-bold text-foreground">
                          Hoy (guardar con fecha y hora actual)
                        </span>
                      </div>
                    </label>

                    {!useNow && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60 animate-in fade-in duration-150">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>Fecha</span>
                          </label>
                          <Input
                            type="date"
                            value={customDate}
                            onChange={(e) =>
                              updateDraft({ customDate: e.target.value })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span>Hora</span>
                          </label>
                          <Input
                            type="time"
                            value={customTime}
                            onChange={(e) =>
                              updateDraft({ customTime: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </ResponsiveDrawer>
  );
}
