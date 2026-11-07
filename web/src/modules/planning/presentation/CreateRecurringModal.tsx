"use client";

import React, { useMemo, useState, useEffect } from "react";
import Decimal from "decimal.js";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import {
  CreateRecurringPaymentRequest,
  RecurringEndType,
  RecurringFlowType,
  RecurringFrequency,
  RecurringPaymentDto,
  UpdateRecurringPaymentRequest,
} from "../domain/planning.types";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { UserCategory } from "@/modules/ledger/domain/category.types";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { CategoryPickerField } from "@/modules/ledger/presentation/CategoryPickerField";
import { CategoryCreatorView } from "@/modules/ledger/presentation/CategoryCreatorView";
import { CategoryIconBadge } from "@/modules/ledger/presentation/CategoryIcon";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

interface CreateRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreate: (req: CreateRecurringPaymentRequest) => Promise<unknown>;
  onSubmitUpdate?: (id: string, req: UpdateRecurringPaymentRequest) => Promise<unknown>;
  accounts: AccountDto[];
  editingItem?: RecurringPaymentDto | null;
  selectedCurrency?: string;
}

const STEP1_FORM_ID = "recurring-step1-form";
const STEP3_FORM_ID = "recurring-step3-form";
const CATEGORY_FORM_ID = "recurring-category-inline-form";

const DIRECTION_OPTIONS = [
  { value: "Expense" as const, label: "Gasto", tone: "expense" as const },
  { value: "Income" as const, label: "Ingreso", tone: "income" as const },
];

const CURRENCY_OPTIONS = [
  { value: "BOB", label: "BOB (Bs.)" },
  { value: "USD", label: "USD ($)" },
  { value: "USDT", label: "USDT" },
];

const FREQUENCY_OPTIONS = [
  { value: "Monthly", label: "Mensual" },
  { value: "Weekly", label: "Semanal" },
  { value: "BiWeekly", label: "Quincenal" },
  { value: "Quarterly", label: "Trimestral" },
  { value: "SemiAnnual", label: "Semestral" },
  { value: "Yearly", label: "Anual" },
];

const QUICK_TITLES: Record<RecurringFlowType, string[]> = {
  Expense: ["Netflix", "Spotify", "Internet", "Luz", "Agua", "Alquiler", "Gimnasio", "Seguro"],
  Income: ["Salario", "Honorarios", "Alquiler cobrado", "Renta", "Venta fija"],
};

export function CreateRecurringModal({
  isOpen,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
  accounts,
  editingItem,
  selectedCurrency = "BOB",
}: CreateRecurringModalProps) {
  const { findCategory } = useUserCategories();
  const isEditing = Boolean(editingItem);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [flowType, setFlowType] = useState<RecurringFlowType>("Expense");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(selectedCurrency);
  const [frequency, setFrequency] = useState<RecurringFrequency>("Monthly");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endType, setEndType] = useState<RecurringEndType>("Never");
  const [endDate, setEndDate] = useState<string>("");
  const [totalOccurrences, setTotalOccurrences] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCategoryFormValid, setIsCategoryFormValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state on open / item change
  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setDescription(editingItem.description ?? "");
      setFlowType(editingItem.flowType);
      setAmount(String(editingItem.amount));
      setCurrency(editingItem.currency);
      setFrequency(editingItem.frequency);
      setStartDate(editingItem.startDate);
      setNextDueDate(editingItem.nextDueDate);
      setEndType(editingItem.endType ?? "Never");
      setEndDate(editingItem.endDate ?? "");
      setTotalOccurrences(editingItem.totalOccurrences ? String(editingItem.totalOccurrences) : "");
      setCategoryId(editingItem.categoryId ?? "");
      setAccountId(editingItem.defaultAccountId ?? "");
      setStep(1);
    } else {
      setName("");
      setDescription("");
      setFlowType("Expense");
      setAmount("");
      setCurrency(selectedCurrency);
      setFrequency("Monthly");
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today);
      setNextDueDate(today);
      setEndType("Never");
      setEndDate("");
      setTotalOccurrences("");
      setCategoryId("");
      const initialAccount = accounts.find((a) => a.currency === selectedCurrency) ?? accounts[0];
      setAccountId(initialAccount?.id ?? "");
      setStep(1);
    }
    setIsCreatingCategory(false);
    setError(null);
  }, [editingItem, accounts, selectedCurrency, isOpen]);

  // Validation
  const isNameValid = name.trim().length > 0;
  let parsedDecimal: Decimal;
  try {
    parsedDecimal = new Decimal(amount || "0");
  } catch {
    parsedDecimal = new Decimal(0);
  }
  const isAmountValid = parsedDecimal.isFinite() && parsedDecimal.gt(0);

  const selectedCategory = findCategory(categoryId) ?? null;
  const availableAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a.currency === currency && b.currency !== currency) return -1;
      if (b.currency === currency && a.currency !== currency) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [accounts, currency]);

  const handleDirectionChange = (nextDirection: RecurringFlowType) => {
    setFlowType(nextDirection);
    // Keep category only if same direction
    if (selectedCategory && selectedCategory.direction.toLowerCase() !== nextDirection.toLowerCase()) {
      setCategoryId("");
    }
  };

  const handleCategoryCreated = (category: UserCategory) => {
    setCategoryId(category.id);
    setIsCreatingCategory(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isNameValid || !isAmountValid) return;

    if (endType === "OnDate" && !endDate) {
      setError("Debes indicar una fecha de finalización.");
      return;
    }

    if (endType === "AfterOccurrences") {
      const parsedOcc = parseInt(totalOccurrences, 10);
      if (isNaN(parsedOcc) || parsedOcc <= 0) {
        setError("El número de cuotas / pagos debe ser un número entero positivo.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && editingItem && onSubmitUpdate) {
        await onSubmitUpdate(editingItem.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          flowType,
          amount: parsedDecimal.toNumber(),
          frequency,
          nextDueDate,
          endType,
          endDate: endType === "OnDate" && endDate ? endDate : undefined,
          totalOccurrences: endType === "AfterOccurrences" && totalOccurrences ? parseInt(totalOccurrences, 10) : undefined,
          categoryId: categoryId || undefined,
          defaultAccountId: accountId || undefined,
        });
      } else {
        await onSubmitCreate({
          name: name.trim(),
          description: description.trim() || undefined,
          flowType,
          amount: parsedDecimal.toNumber(),
          currency,
          frequency,
          startDate,
          nextDueDate: nextDueDate || startDate,
          endType,
          endDate: endType === "OnDate" && endDate ? endDate : undefined,
          totalOccurrences: endType === "AfterOccurrences" && totalOccurrences ? parseInt(totalOccurrences, 10) : undefined,
          categoryId: categoryId || undefined,
          defaultAccountId: accountId || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const drawerTitle = isCreatingCategory
    ? `Nueva categoría de ${flowType === "Expense" ? "gasto" : "ingreso"}`
    : isEditing
    ? "Editar pago recurrente"
    : "Nuevo pago recurrente";

  const drawerDescription = isCreatingCategory
    ? "Elegí un ícono y nombre para crear una nueva categoría en tu catálogo."
    : "Configura suscripciones, servicios o cobros periódicos para recibir alertas y confirmar en 1-Clic.";

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={drawerTitle}
      description={drawerDescription}
      footer={
        isCreatingCategory ? (
          <>
            <Button
              type="submit"
              form={CATEGORY_FORM_ID}
              size="lg"
              disabled={!isCategoryFormValid}
              className="order-1 w-full md:order-2 md:flex-1"
            >
              Guardar categoría
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
        ) : step === 1 ? (
          <>
            <Button
              type="button"
              size="lg"
              disabled={!isNameValid}
              onClick={() => setStep(2)}
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
              className="order-2 w-full md:order-1 md:w-auto"
            >
              Cancelar
            </Button>
          </>
        ) : step === 2 ? (
          <>
            <Button
              type="button"
              size="lg"
              onClick={() => setStep(3)}
              className="order-1 w-full md:order-2 md:flex-1 gap-2"
            >
              <span>Siguiente: Programación</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setStep(1)}
              className="order-2 w-full md:order-1 md:w-auto gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Atrás
            </Button>
          </>
        ) : (
          <>
            <Button
              type="submit"
              form={STEP3_FORM_ID}
              size="lg"
              loading={submitting}
              disabled={!isAmountValid}
              className="order-1 w-full md:order-2 md:flex-1 bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {submitting ? "Guardando..." : isEditing ? "Actualizar recurrente" : "Guardar recurrente"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setStep(2)}
              className="order-2 w-full md:order-1 md:w-auto gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Atrás
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-5 py-2">
        {/* Stepper Navigation (Only when not in CategoryCreator) */}
        {!isCreatingCategory && (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-muted/40 border border-border text-xs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                step === 1
                  ? "bg-purple-600 text-white shadow-xs"
                  : isNameValid
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground"
              }`}
            >
              <span>1. Concepto</span>
              {isNameValid && step !== 1 && <Check className="w-3 h-3 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={() => isNameValid && setStep(2)}
              disabled={!isNameValid}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                step === 2
                  ? "bg-purple-600 text-white shadow-xs"
                  : selectedCategory
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground"
              }`}
            >
              <span>2. Categoría</span>
              {selectedCategory && step !== 2 && <Check className="w-3 h-3 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={() => isNameValid && setStep(3)}
              disabled={!isNameValid}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                step === 3
                  ? "bg-purple-600 text-white shadow-xs"
                  : isAmountValid
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground"
              }`}
            >
              <span>3. Programación</span>
              {isAmountValid && step !== 3 && <Check className="w-3 h-3 text-emerald-400" />}
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Content By State */}
        {isCreatingCategory ? (
          <CategoryCreatorView
            formId={CATEGORY_FORM_ID}
            direction={flowType}
            onCancel={() => setIsCreatingCategory(false)}
            onCreated={handleCategoryCreated}
            onValidityChange={setIsCategoryFormValid}
          />
        ) : step === 1 ? (
          /* Step 1: Concepto & Moneda */
          <form
            id={STEP1_FORM_ID}
            onSubmit={(e) => {
              e.preventDefault();
              if (isNameValid) setStep(2);
            }}
            className="flex flex-col gap-5"
          >
            {/* Tipo de movimiento */}
            <FormField label="Tipo de recurrente" required>
              {() => (
                <SegmentedControl
                  aria-label="Tipo de recurrente"
                  fullWidth
                  value={flowType}
                  onChange={(val) => handleDirectionChange(val as RecurringFlowType)}
                  options={DIRECTION_OPTIONS}
                />
              )}
            </FormField>

            {/* Nombre */}
            <FormField
              label="Nombre del servicio o concepto"
              required
              hint="Ej: Netflix, Internet Fibra, Alquiler depto, Salario mensual"
            >
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  placeholder="¿De qué servicio o cobro se trata?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              )}
            </FormField>

            {/* Sugerencias Rápidas */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Sugerencias frecuentes
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_TITLES[flowType].map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setName(title)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      name.toLowerCase() === title.toLowerCase()
                        ? "bg-primary/20 border-primary text-primary font-bold"
                        : "bg-card border-border hover:bg-muted text-foreground"
                    }`}
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>

            {/* Moneda */}
            <FormField label="Moneda de pago" hint="Moneda en la que se fija el compromiso recurrente.">
              {() => (
                <SegmentedControl
                  aria-label="Moneda"
                  fullWidth
                  value={currency}
                  onChange={(val) => setCurrency(val)}
                  options={CURRENCY_OPTIONS}
                  disabled={isEditing}
                />
              )}
            </FormField>
          </form>
        ) : step === 2 ? (
          /* Step 2: Categoría con CategoryPickerField y creación integrada */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border">
              <div className="flex items-center gap-2.5">
                {selectedCategory ? (
                  <CategoryIconBadge
                    iconKey={selectedCategory.iconKey}
                    colorKey={selectedCategory.colorKey}
                    size="md"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl border border-dashed border-border bg-card flex items-center justify-center text-muted-foreground text-xs font-bold">
                    ?
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-muted-foreground">Categoría seleccionada</span>
                  <span className="text-sm font-bold text-foreground">
                    {selectedCategory ? selectedCategory.name : "Sin categoría (opcional)"}
                  </span>
                </div>
              </div>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setCategoryId("")}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground underline"
                >
                  Quitar
                </button>
              )}
            </div>

            <CategoryPickerField
              direction={flowType}
              selectedCategoryId={categoryId}
              onSelectCategory={(cat) => setCategoryId(cat?.id ?? "")}
              onRequestCreateCategory={() => setIsCreatingCategory(true)}
            />
          </div>
        ) : (
          /* Step 3: Monto, Frecuencia, Fecha y Cuenta Predeterminada */
          <form
            id={STEP3_FORM_ID}
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
          >
            {/* Monto */}
            <FormField label="Monto estimado por período" required>
              {(control) => (
                <MoneyInput
                  {...control}
                  size="lg"
                  currency={currency === "BOB" ? "Bs" : currency === "USD" ? "$" : "USDT"}
                  value={amount}
                  onValueChange={setAmount}
                />
              )}
            </FormField>

            {/* Frecuencia y Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Frecuencia" required>
                {() => (
                  <Select
                    value={frequency}
                    onValueChange={(val) => val && setFrequency(val as RecurringFrequency)}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Selecciona frecuencia">
                        {FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label ?? frequency}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField
                label="Fecha de inicio"
                required
                hint="Cuándo comienza el ciclo."
              >
                {(control) => (
                  <Input
                    {...control}
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                )}
              </FormField>

              <FormField
                label="Próximo vencimiento"
                required
                hint="Día para aceptar pago."
              >
                {(control) => (
                  <Input
                    {...control}
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                  />
                )}
              </FormField>
            </div>

            {/* Condición de Finalización */}
            <FormField
              label="Finalización de la repetición"
              hint="Establece si el flujo continúa indefinidamente o termina en una fecha o tras N cuotas."
            >
              {() => (
                <SegmentedControl
                  aria-label="Condición de finalización"
                  fullWidth
                  value={endType}
                  onChange={(val) => setEndType(val as RecurringEndType)}
                  options={[
                    { value: "Never", label: "Nunca" },
                    { value: "OnDate", label: "Por fecha" },
                    { value: "AfterOccurrences", label: "Por cuotas" },
                  ]}
                />
              )}
            </FormField>

            {endType === "OnDate" && (
              <FormField
                label="Fecha de finalización"
                required
                hint="El recurrente se completará automáticamente tras superar esta fecha."
              >
                {(control) => (
                  <Input
                    {...control}
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                )}
              </FormField>
            )}

            {endType === "AfterOccurrences" && (
              <FormField
                label="Cantidad total de cuotas / pagos"
                required
                hint="Al aceptar esta cantidad de pagos, el recurrente se completará."
              >
                {(control) => (
                  <Input
                    {...control}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Ej: 12"
                    value={totalOccurrences}
                    onChange={(e) => setTotalOccurrences(e.target.value)}
                  />
                )}
              </FormField>
            )}

            {/* Cuenta Predeterminada */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Cuenta sugerida para {flowType === "Expense" ? "débito" : "ingreso"} (Opcional)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Se preseleccionará al confirmar pago en 1-Clic
                </span>
              </div>

              {availableAccounts.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
                  No tenés cuentas registradas. Podés crear el recurrente sin cuenta y seleccionarla al momento de pagar.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Opción sin cuenta */}
                  <button
                    type="button"
                    onClick={() => setAccountId("")}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1 ${
                      !accountId
                        ? "bg-primary/10 border-primary text-foreground ring-2 ring-primary/30"
                        : "bg-card border-border text-foreground hover:bg-muted/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Sin cuenta predeterminada</span>
                      {!accountId && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground">Elegir al momento de pagar</span>
                  </button>

                  {/* Cuentas del usuario */}
                  {availableAccounts.map((acc) => {
                    const isSelected = acc.id === accountId;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setAccountId(acc.id)}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1 ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground ring-2 ring-primary/30"
                            : "bg-card border-border text-foreground hover:bg-muted/70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold truncate">{acc.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span>{acc.currency}</span>
                          <span className="font-semibold text-foreground">{acc.balance.toFixed(2)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notas opcionales */}
            <FormField label="Notas o descripción adicional">
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  placeholder="Ej: Plan familiar con 4 pantallas, debitar antes del día 20"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              )}
            </FormField>
          </form>
        )}
      </div>
    </ResponsiveDrawer>
  );
}
