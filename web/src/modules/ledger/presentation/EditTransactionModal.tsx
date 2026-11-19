"use client";

import React, { useEffect, useState } from "react";
import Decimal from "decimal.js";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Trash2,
} from "lucide-react";
import {
  AccountDto,
  TransactionDirection,
  TransactionDto,
  UpdateTransactionRequest,
  encodeTransactionText,
  parseTransactionText,
} from "@/modules/ledger/domain/ledger.types";
import {
  useUserCategories,
  isValidUuid,
} from "@/modules/ledger/application/CategoriesContext";
import {
  combineDateAndTimeToIso,
  getLocalDateString,
  getLocalTimeString,
} from "@/modules/ledger/application/useTransactionFormDraft";
import { CategoryPickerField } from "./CategoryPickerField";
import { CategoryCreatorView } from "./CategoryCreatorView";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { isPositiveDecimal } from "@/shared/lib/money-input";
import { currencyChipLabel, normalizeAmountString } from "@/shared/lib/keypad";
import { translateTransactionError } from "@/modules/ledger/domain/transaction-errors";
import { Amount } from "@/shared/ui/amount";
import { useNumberFormat, useNumberPreferences } from "@/shared/hooks/use-number-format";
import { formatAmountText } from "@/shared/lib/amount-format";
import { formatCurrencyLabel } from "@/shared/lib/currency";

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: TransactionDto | null;
  accounts: AccountDto[];
  p2pRate?: number;
  onClose: () => void;
  onUpdate: (
    transactionId: string,
    req: UpdateTransactionRequest
  ) => Promise<void>;
  onDelete: (transactionId: string) => Promise<void>;
}

const EDIT_FORM_ID = "edit-transaction-form";
const EDIT_CAT_FORM_ID = "edit-transaction-category-form";


const DIRECTION_OPTIONS = [
  { value: "Expense" as const, label: "Gasto", tone: "expense" as const },
  { value: "Income" as const, label: "Ingreso", tone: "income" as const },
];

export function EditTransactionModal({
  isOpen,
  transaction,
  accounts,
  p2pRate = 9.85,
  onClose,
  onUpdate,
  onDelete,
}: EditTransactionModalProps) {
  const { findCategory } = useUserCategories();
  const formatNumber = useNumberFormat();
  const numberPreferences = useNumberPreferences();

  const [direction, setDirection] = useState<TransactionDirection>("Expense");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCategoryFormValid, setIsCategoryFormValid] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!transaction || !isOpen) {
      setIsCreatingCategory(false);
      setConfirmingDelete(false);
      return;
    }

    const parsedText = parseTransactionText(transaction.description);
    const matchedCat = findCategory(
      transaction.categoryId || parsedText.title
    );
    const occurredDate = transaction.occurredAt
      ? new Date(transaction.occurredAt)
      : new Date();

    setDirection(transaction.direction);
    setTitle(
      parsedText.title ||
        matchedCat?.name ||
        (transaction.direction === "Income" ? "Ingreso" : "Gasto")
    );
    setDetails(parsedText.details);
    setSelectedCategoryId(matchedCat?.id || transaction.categoryId || "");
    setAmount(transaction.amount.toString());
    setAccountId(transaction.accountId);
    setCustomDate(getLocalDateString(occurredDate));
    setCustomTime(getLocalTimeString(occurredDate));
    setIsCreatingCategory(false);
    setConfirmingDelete(false);
  }, [transaction, isOpen, findCategory]);

  if (!transaction) return null;

  const selectedCategory = findCategory(selectedCategoryId) || null;
  const effectiveAccountId = accounts.some((a) => a.id === accountId)
    ? accountId
    : accounts[0]?.id || "";
  const selectedAccount = accounts.find((a) => a.id === effectiveAccountId);

  const normalizedAmount = normalizeAmountString(amount);
  const isAmountValid = isPositiveDecimal(normalizedAmount);
  const isTitleValid = title.trim().length > 0;
  const isFormValid = isTitleValid && isAmountValid && !!effectiveAccountId;

  const amountDecimal = new Decimal(isAmountValid ? normalizedAmount : "0");
  const isUsdAccount =
    selectedAccount?.currency === "USD" || selectedAccount?.currency === "USDT";
  const rateLabel = `${formatCurrencyLabel("BOB")} ${formatNumber(p2pRate)}`;
  const equivText = isAmountValid
    ? isUsdAccount
      ? `≈ ${formatAmountText(amountDecimal.times(p2pRate), "BOB", numberPreferences)} (P2P ${rateLabel})`
      : `≈ ${formatAmountText(amountDecimal.div(p2pRate || 9.85), "USD", numberPreferences)} (P2P ${rateLabel})`
    : null;

  const handleDirectionChange = (nextDirection: TransactionDirection) => {
    setDirection(nextDirection);
    if (
      selectedCategory &&
      selectedCategory.direction.toLowerCase() !== nextDirection.toLowerCase()
    ) {
      setSelectedCategoryId("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const occurredAt = combineDateAndTimeToIso(customDate, customTime);
      const combinedDescription = encodeTransactionText(title, details);

      await onUpdate(transaction.id, {
        accountId: effectiveAccountId,
        amount: normalizedAmount,
        direction,
        categoryId:
          selectedCategory && isValidUuid(selectedCategory.id)
            ? selectedCategory.id
            : undefined,
        description: combinedDescription || undefined,
        occurredAt,
      });
      onClose();
    } catch (reason) {
      setSubmitError(translateTransactionError(reason, "No se pudo guardar el movimiento. Intentá de nuevo."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(transaction.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const directionLabel = direction === "Expense" ? "gasto" : "ingreso";

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={
        isCreatingCategory
          ? `Nueva categoría de ${directionLabel}`
          : "Editar movimiento"
      }
      size="lg"
      description={
        isCreatingCategory
          ? "Elegí un nombre, color de fondo e ícono para tu categoría."
          : "Modificá el título, descripción, categoría, monto, cuenta o fecha y hora."
      }
      footer={
        isCreatingCategory ? (
          <>
            <Button
              type="submit"
              form={EDIT_CAT_FORM_ID}
              size="lg"
              disabled={!isCategoryFormValid}
              className="order-1 w-full md:order-2 md:flex-1"
            >
              Crear y seleccionar categoría
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setIsCreatingCategory(false)}
              className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </>
        ) : (
          <>
            <Button
              type="submit"
              form={EDIT_FORM_ID}
              size="lg"
              loading={submitting}
              disabled={!isFormValid || deleting}
              className="order-1 w-full md:order-2 md:flex-1"
            >
              {submitting ? "Guardando cambios..." : "Guardar cambios"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={submitting || deleting}
              onClick={onClose}
              className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card"
            >
              Cancelar
            </Button>
          </>
        )
      }
    >
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
            formId={EDIT_CAT_FORM_ID}
            direction={direction}
            onCancel={() => setIsCreatingCategory(false)}
            onValidityChange={setIsCategoryFormValid}
            onCreated={(created) => {
              setSelectedCategoryId(created.id);
              setIsCreatingCategory(false);
            }}
          />
        ) : (
          <form
            id={EDIT_FORM_ID}
            onSubmit={handleSave}
            className="flex flex-col gap-5 animate-in fade-in duration-150"
          >
            {/* Title */}
            <FormField label="Título del movimiento" required>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Almuerzo, Supermercado, Pago cliente..."
                />
              )}
            </FormField>

            {/* Detailed Description / Notes */}
            <FormField
              label="Descripción detallada o notas (opcional)"
              hint="Agregá cualquier detalle adicional, número de comprobante o comentario."
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Ej. Reunión con cliente, incluye propina, factura #1042..."
                />
              )}
            </FormField>

            {/* Category Gallery */}
            <CategoryPickerField
              direction={direction}
              selectedCategoryId={selectedCategory?.id || ""}
              onSelectCategory={(cat) => setSelectedCategoryId(cat?.id || "")}
              onRequestCreateCategory={() => setIsCreatingCategory(true)}
            />

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-foreground">
                Monto <span className="text-rose-500">*</span>
              </span>
              <MoneyInput
                aria-label="Monto"
                size="lg"
                currency={currencyChipLabel(selectedAccount?.currency)}
                value={amount}
                onValueChange={(val) => {
                  setSubmitError("");
                  setAmount(val);
                }}
              />
              {submitError && (
                <span role="alert" className="text-xs font-semibold text-rose-500 px-1">
                  {submitError}
                </span>
              )}
              {equivText && !submitError && (
                <span className="text-xs font-semibold text-muted-foreground tabular-nums px-1">
                  {equivText}
                </span>
              )}
            </div>

            {/* Account Selector */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-foreground">Cuenta</span>
              <div className="grid grid-cols-2 gap-2">
                {accounts.map((acc) => {
                  const isSelected = acc.id === effectiveAccountId;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setAccountId(acc.id)}
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

            {/* Date and Time */}
            <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-foreground">
                  Fecha y hora del movimiento
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCustomDate(getLocalDateString(now));
                    setCustomTime(getLocalTimeString(now));
                  }}
                  className="text-[11px] font-extrabold text-primary hover:underline"
                >
                  Usar ahora (Hoy)
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Fecha</span>
                  </label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
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
                    onChange={(e) => setCustomTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Delete Movement Section with Confirmation */}
            <div className="pt-2 border-t border-border">
              {!confirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-extrabold transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar movimiento</span>
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex flex-col gap-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-extrabold text-foreground">
                        ¿Estás seguro de eliminar este movimiento?
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Se registrará la reversión contable y el saldo de tu cuenta se actualizará inmediatamente.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deleting}
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      loading={deleting}
                      onClick={handleConfirmDelete}
                    >
                      Sí, eliminar movimiento
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </ResponsiveDrawer>
  );
}
