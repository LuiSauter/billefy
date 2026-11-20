"use client";

import React, { useEffect, useRef, useState } from "react";
import Decimal from "decimal.js";
import { BarChart3, Calculator, Car, Coins, CreditCard, FileText, House, Layers, Sparkles, Users } from "lucide-react";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";
import {
  EARLY_PAYMENT_POLICY_OPTIONS,
  type EarlyPaymentPolicy,
  getCompatibleEarlyPaymentPolicies,
  LOAN_TEMPLATE_OPTIONS,
  type CreateLoanRequest,
  type LoanScheduleDto,
  type LoanTemplate,
  type SimulateLoanRequest,
} from "../../domain/lending.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { Progress } from "@/shared/ui/progress";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SelectField } from "@/shared/ui/select-field";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { Amount } from "@/shared/ui/amount";
import { formatAmountText, formatPercent } from "@/shared/lib/amount-format";
import { useNumberPreferences } from "@/shared/hooks/use-number-format";

export interface CreateDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountDto[];
  /** Income is denominated in selectedCurrency (BOB by default). */
  monthlyIncome?: number;
  selectedCurrency?: string;
  /** BOB per USD; required only for cross-currency DTI. */
  p2pRate?: number;
  onSimulate?: (req: SimulateLoanRequest) => Promise<LoanScheduleDto>;
  onSubmit: (req: CreateLoanRequest) => Promise<unknown>;
}

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const FORM_ID = "create-debt-form";
const CATEGORIES = ["Personal", "Hipoteca", "Vehicular", "Tarjeta"] as const;
type Category = (typeof CATEGORIES)[number];
const QUICK_TEMPLATES = [
  { category: "Tarjeta", label: "Tarjeta", rate: "36", term: "12", icon: CreditCard },
  { category: "Hipoteca", label: "Hipoteca", rate: "9.5", term: "240", icon: House },
  { category: "Vehicular", label: "Vehicular", rate: "11", term: "48", icon: Car },
  { category: "Personal", label: "Préstamo personal", rate: "18", term: "24", icon: Users },
] as const;
function initialForm() {
  return { reference: "", creditor: "", account: "", currency: "BOB", principal: "", rate: "18", term: "24",
    date: new Date().toISOString().slice(0, 10), method: "FixedInstallment" as LoanTemplate,
    category: "Personal" as Category, description: "", earlyPaymentPolicy: "AdvanceInstallments" as EarlyPaymentPolicy,
    originationKind: "CashDisbursement" as "CashDisbursement" | "OpeningBalance", loanKind: "Loan" as "Loan" | "CreditCard" };
}
function decimal(value: string | number): Decimal | null {
  try {
    if (value === "") return null;
    const result = new D(value);
    return result.isFinite() && !result.isNegative() && Number.isFinite(result.toNumber()) ? result : null;
  } catch { return null; }
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validSchedule(schedule: LoanScheduleDto) {
  return schedule.installments.length > 0 &&
    [schedule.totalPrincipal, schedule.totalInterest, schedule.totalToPay, schedule.annualEffectiveRate,
      ...schedule.installments.flatMap(item => [item.total, item.principal, item.interest, item.balanceAfter])]
      .every(value => typeof value === "number" && decimal(value) !== null);
}
type Simulation = {
  key: string;
  source: CreateDebtModalProps["onSimulate"];
  status: "loading" | "ready" | "error";
  schedule?: LoanScheduleDto;
};
function Panel({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return <Card className="space-y-4 p-4">
    <h3 className="flex items-center gap-2 text-sm font-bold"><Icon aria-hidden="true" className="size-5 text-primary" />{title}</h3>
    {children}
  </Card>;
}

export function CreateDebtModal({ isOpen, onClose, accounts, monthlyIncome, selectedCurrency = "BOB", p2pRate,
  onSimulate, onSubmit }: CreateDebtModalProps) {
  const preferences = useNumberPreferences();
  const [form, setForm] = useState(initialForm);
  const [includeDti, setIncludeDti] = useState(true);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const patch = (values: Partial<typeof form>) => setForm(current => ({ ...current, ...values }));

  const principal = decimal(form.principal);
  const annualPercent = form.method === "NoInterest" ? new D(0) : decimal(form.rate);
  const rate = annualPercent?.div(100);
  const term = Number(form.term);
  const validTerms = Boolean(principal?.gt(0) && principal.decimalPlaces() <= 2 && principal.lte("99999999999999.99")
    && rate && Number.isSafeInteger(term) && term > 0 && validDate(form.date));
  const account = accounts.find(item => item.id === form.account && item.currency === form.currency);
  const opening = form.originationKind === "OpeningBalance";
  const card = form.loanKind === "CreditCard";
  const isValid = validTerms && form.reference.trim().length > 0 && form.creditor.trim().length > 0 && (opening || Boolean(account));
  const requestKey = validTerms ? JSON.stringify({ principal: principal!.toString(), rate: rate!.toNumber(),
    rateUnit: "Annual", frequency: "Monthly", template: form.method, totalInstallments: term,
    disbursementDate: form.date } satisfies SimulateLoanRequest) : "";

  useEffect(() => {
    if (isOpen) return;
    setForm(initialForm()); setIncludeDti(true); setSimulation(null); setError("");
  }, [isOpen]);

  useEffect(() => {
    setSimulation(null);
    if (!isOpen || !onSimulate || !requestKey) return;
    let active = true;
    setSimulation({ key: requestKey, source: onSimulate, status: "loading" });
    const timer = setTimeout(async () => {
      try {
        const schedule = await onSimulate(JSON.parse(requestKey) as SimulateLoanRequest);
        if (!validSchedule(schedule)) throw new Error("Invalid schedule");
        if (active) setSimulation({ key: requestKey, source: onSimulate, status: "ready", schedule });
      } catch {
        if (active) setSimulation({ key: requestKey, source: onSimulate, status: "error" });
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [isOpen, onSimulate, requestKey]);

  const currentSimulation = simulation?.key === requestKey && simulation.source === onSimulate ? simulation : null;
  const schedule = currentSimulation?.status === "ready" ? currentSimulation.schedule : undefined;
  // Show the first real installment, not an invented annuity. Other methods may
  // vary by period; the server is the only authority for installment amounts.
  const installment = schedule ? new D(schedule.installments[0].total) : null;
  const incomeCurrency = selectedCurrency.toUpperCase() === "USDT" ? "USD" : selectedCurrency.toUpperCase();
  let incomePayment = installment;
  let fxMissing = false;
  if (installment && form.currency !== incomeCurrency) {
    const validFx = p2pRate !== undefined && Number.isFinite(p2pRate) && p2pRate > 0;
    if (validFx && ["USD", "BOB"].includes(incomeCurrency)) {
      incomePayment = incomeCurrency === "BOB" ? installment.times(new D(p2pRate)) : installment.div(new D(p2pRate));
    } else { incomePayment = null; fxMissing = true; }
  }
  const validIncome = monthlyIncome !== undefined && Number.isFinite(monthlyIncome) && monthlyIncome > 0;
  const dti = validIncome && incomePayment ? incomePayment.div(new D(monthlyIncome)).times(100) : null;
  const dtiStatus = dti ? dti.lt(30) ? "Controlado" : dti.lte(40) ? "Atención" : "Crítico" : null;
  const extra = installment?.times("0.1").toDecimalPlaces(2);
  const simulationMessage = !onSimulate ? "Simulación no disponible: conecta el cálculo del servidor para ver la cuota."
    : !validTerms ? "Completa monto, tasa, plazo y fecha para simular."
      : currentSimulation?.status === "error" ? "No se pudo simular. Modifica las condiciones para reintentar."
        : "Calculando cronograma…";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isOpen || !isValid || submitLock.current) return;
    submitLock.current = true; setSubmitting(true); setError("");
    const counterpartyNotes = [`Referencia: ${form.reference.trim()}`, `Categoría: ${form.category}`,
      ...(form.description.trim() ? [`Descripción: ${form.description.trim()}`] : [])].join("\n");
    try {
      await onSubmit({ type: "Borrowed", counterpartyName: form.creditor.trim(), principal: principal!.toString(),
        currency: form.currency, interestRate: rate!.toNumber(), rateUnit: "Annual", frequency: "Monthly",
        template: form.method, totalInstallments: term, disbursementDate: form.date,
        disbursementAccountId: opening ? undefined : account!.id, counterpartyNotes, earlyPaymentPolicy: form.earlyPaymentPolicy,
        ...(opening ? { originationKind: "OpeningBalance" as const } : {}),
        ...(card ? { loanKind: "CreditCard" as const } : {}) });
    } catch {
      setError("No se pudo crear la deuda. Tus datos se conservaron; inténtalo de nuevo.");
      submitLock.current = false; setSubmitting(false);
      return;
    }
    // Keep the lock after success until this modal closes, preventing duplicate writes.
    setSubmitting(false);
    onClose();
  }
  useEffect(() => {
    if (!isOpen) { submitLock.current = false; setSubmitting(false); }
  }, [isOpen]);

  return <ResponsiveDrawer open={isOpen} onOpenChange={open => { if (!open && !submitLock.current) onClose(); }} size="xl"
    title={<span className="flex items-center gap-2"><Coins aria-hidden="true" className="size-6 text-primary" />Crear deuda / préstamo</span>}
    description="Registra una nueva obligación o dinero prestado, define sus condiciones y lleva control de pagos."
    footer={<>
      <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>Cancelar</Button>
      <Button type="submit" form={FORM_ID} disabled={!isValid || submitting} loading={submitting}>Crear deuda</Button>
    </>}>
    <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5" aria-busy={submitting}>
      <fieldset disabled={submitting} className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="secondary">Deuda</Badge>
          <SegmentedControl aria-label="Categoría de deuda" value={form.category}
            onChange={category => patch({ category })} options={CATEGORIES.map(category => ({ value: category, label: category }))}
            className="max-w-full overflow-x-auto" />
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Panel title="Datos de la deuda" icon={FileText}>
            <FormGrid>
              <FormField htmlFor="debt-kind" label="Tipo de obligación">{control =>
                <SelectField {...control} value={form.loanKind} options={[{ value: "Loan", label: "Préstamo" }, { value: "CreditCard", label: "Tarjeta de crédito" }]}
                  onChange={e => e.target.value === "CreditCard" ? patch({ loanKind: "CreditCard", originationKind: "OpeningBalance",
                    category: "Tarjeta", account: "", method: "NoInterest", rate: "0", term: "1", earlyPaymentPolicy: "AdvanceInstallments" })
                    : patch({ loanKind: "Loan" })} />}</FormField>
              <FormField htmlFor="debt-origin" label="Origen del saldo" hint={opening ? "No crea efectivo ni ingreso. Registra solo el capital que ya debes." : "Recibes efectivo y una deuda; no es ingreso."}>{control =>
                <SelectField {...control} value={form.originationKind} disabled={card}
                  options={[{ value: "CashDisbursement", label: "Nuevo desembolso a mi cuenta" }, { value: "OpeningBalance", label: "Deuda existente / saldo de apertura" }]}
                  onChange={e => patch({ originationKind: e.target.value as typeof form.originationKind, account: "" })} />}</FormField>
              <FormField htmlFor="debt-reference" label="Nombre / referencia" required>{control =>
                <Input {...control} required maxLength={150} value={form.reference} onChange={e => patch({ reference: e.target.value })} />}</FormField>
              <FormField htmlFor="debt-creditor" label="Acreedor" required>{control =>
                <Input {...control} required maxLength={150} value={form.creditor} onChange={e => patch({ creditor: e.target.value })} />}</FormField>
              <FormField htmlFor="debt-account" label="Cuenta asociada" required={!opening} hint={opening ? "Sin movimiento de efectivo al registrar la apertura." : "Se registrará el desembolso en esta cuenta."}>{control =>
                <SelectField {...control} required={!opening} disabled={opening} value={form.account} placeholder="Selecciona una cuenta"
                  onChange={e => patch({ account: e.target.value })}
                  options={accounts.filter(item => item.currency === form.currency).map(item => ({ value: item.id, label: item.name }))} />}</FormField>
              <FormField htmlFor="debt-currency" label="Moneda" required>{control =>
                <SelectField {...control} value={form.currency} onChange={e => patch({ currency: e.target.value, account: "" })}
                  options={[{ value: "BOB", label: "Bolivianos (BOB)" }, { value: "USD", label: "Dólares (USD)" }]} />}</FormField>
              <FormField htmlFor="debt-principal" label="Monto inicial" required>{control =>
                <MoneyInput {...control} required value={form.principal} currency={form.currency}
                  onValueChange={principal => patch({ principal })} />}</FormField>
              <FormField htmlFor="debt-balance" label="Saldo actual" hint="Al crear una deuda, el saldo es igual al monto inicial.">{control =>
                <MoneyInput {...control} readOnly value={form.principal} currency={form.currency} onValueChange={() => {}} />}</FormField>
              <FormField htmlFor="debt-rate" label="Tasa de interés anual %" required>{control =>
                <Input {...control} type="number" min="0" step="0.01" required disabled={form.method === "NoInterest"}
                  value={form.method === "NoInterest" ? "0" : form.rate} onChange={e => patch({ rate: e.target.value })} />}</FormField>
              <FormField htmlFor="debt-term" label="Plazo (meses)" required>{control =>
                <Input {...control} type="number" min="1" step="1" required disabled={card} value={form.term} onChange={e => patch({ term: e.target.value })} />}</FormField>
              <FormField htmlFor="debt-date" label="Fecha de inicio" required>{control =>
                <Input {...control} type="date" required value={form.date} onChange={e => patch({ date: e.target.value })} />}</FormField>
              <FormField htmlFor="debt-method" label="Método de cálculo">{control =>
                <SelectField {...control} disabled={card} value={form.method} options={LOAN_TEMPLATE_OPTIONS}
                  onChange={e => patch({ method: e.target.value as LoanTemplate })} />}</FormField>
              <FormField htmlFor="debt-early-policy" label="Pagos mayores o anticipados"
                hint={EARLY_PAYMENT_POLICY_OPTIONS.find(p => p.value === form.earlyPaymentPolicy)?.description}>{control =>
                <SelectField {...control} id="debt-early-policy" disabled={card} value={form.earlyPaymentPolicy}
                  options={getCompatibleEarlyPaymentPolicies(form.method).map(p => ({ value: p.value, label: p.label }))}
                  onChange={e => patch({ earlyPaymentPolicy: e.target.value as EarlyPaymentPolicy })} />}</FormField>
            </FormGrid>
            {!opening && accounts.filter(item => item.currency === form.currency).length === 0 &&
              <p role="status" className="text-sm text-muted-foreground">No hay cuentas en {form.currency}. Crea una cuenta compatible antes de registrar la deuda.</p>}
            <FormField htmlFor="debt-description" label="Descripción / Notas" hint="Referencia, categoría y descripción se guardan como notas de la contraparte.">{control =>
              <Textarea {...control} rows={3} maxLength={500} value={form.description} onChange={e => patch({ description: e.target.value })} />}</FormField>
            <div className="space-y-3 border-t border-border pt-4">
              {[["debt-reminders", "Incluir recordatorios"], ["debt-recurring", "Generar movimiento recurrente"]].map(([id, label]) =>
                <div key={id} className="flex items-center justify-between gap-2">
                  <label htmlFor={id} className="text-sm">{label}</label>
                  <Badge variant="outline">Próximamente</Badge>
                  <Switch id={id} checked={false} disabled aria-label={label} />
                </div>)}
              <FormField htmlFor="debt-dti" label="Afecta ratio de endeudamiento" hint="Solo vista previa; esta preferencia no se guarda.">{control =>
                <Switch {...control} aria-label="Afecta ratio de endeudamiento" checked={includeDti} onCheckedChange={checked => setIncludeDti(checked)} />}</FormField>
            </div>
          </Panel>
          <div className="min-w-0 space-y-4">
            <Panel title="Resumen del impacto" icon={BarChart3}>
              <dl className="space-y-2 text-sm">
                {[["Tipo", `Deuda · ${form.category}`], ["Saldo", principal ? <Amount value={principal} currency={form.currency} size="sm" /> : "—"],
                  ["Cuota mensual calculada", installment ? <Amount value={installment} currency={form.currency} size="sm" /> : "—"],
                  ["Interés anual", annualPercent ? `${annualPercent.toString()}%` : "—"], ["Cuenta", account?.name ?? "Sin seleccionar"]].map(([label, value]) =>
                  <div key={String(label)} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold">{value}</dd></div>)}
              </dl>
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-sm font-semibold">Deuda / ingreso (DTI)</p>
                <p className="text-xs text-muted-foreground">Impacto de esta deuda, no del endeudamiento total. Ingresos en {incomeCurrency}.</p>
                {!includeDti ? <p className="text-sm text-muted-foreground">Excluida de esta vista previa</p>
                  : !validIncome ? <p className="text-sm text-muted-foreground">Registra tus ingresos mensuales para evaluar el DTI.</p>
                    : fxMissing ? <p className="text-sm text-muted-foreground">Falta un tipo de cambio válido para calcular el DTI.</p>
                      : dti ? <>
                        <p className="flex justify-between text-sm"><span>{dtiStatus}</span><strong>{formatPercent(dti, preferences)}</strong></p>
                        <Progress aria-label="Deuda / ingreso" value={D.min(100, dti).toNumber()} />
                      </> : <p className="text-sm text-muted-foreground">Simula para evaluar la cuota.</p>}
              </div>
            </Panel>
            <Panel title="Simulación rápida" icon={Calculator}>
              <FormGrid>
                <FormField htmlFor="debt-preview-term" label="Plazo">{control =>
                  <Input {...control} type="number" min="1" step="1" disabled={card} value={form.term} onChange={e => patch({ term: e.target.value })} />}</FormField>
                <FormField htmlFor="debt-preview-rate" label="Interés anual (%)">{control =>
                  <Input {...control} type="number" min="0" step="0.01" disabled={form.method === "NoInterest"}
                    value={form.method === "NoInterest" ? "0" : form.rate} onChange={e => patch({ rate: e.target.value })} />}</FormField>
              </FormGrid>
              <FormField htmlFor="debt-preview-payment" label="Cuota" hint="Primera cuota del cronograma; puede variar según el método.">{control =>
                <Input {...control} readOnly value={installment ? formatAmountText(installment, form.currency, preferences) : ""} placeholder="Pendiente de simulación" />}</FormField>
              {!schedule ? <p role={currentSimulation?.status === "error" ? "alert" : "status"} className="text-sm text-muted-foreground">{simulationMessage}</p>
                : <div aria-live="polite" className="space-y-2 text-sm">
                  <p>Interés total: <strong><Amount value={schedule.totalInterest} currency={form.currency} size="sm" /></strong></p>
                  <p>Total a pagar: <strong><Amount value={schedule.totalToPay} currency={form.currency} size="sm" /></strong></p>
                  {extra?.gt(0) && <p className="rounded-xl border border-primary/20 bg-primary/5 p-3">Si adelantas <Amount value={extra} currency={form.currency} size="sm" />/mes, tu aporte sería <Amount value={installment!.plus(extra)} currency={form.currency} size="sm" />. Solicita una nueva simulación para conocer el plazo resultante.</p>}
                </div>}
            </Panel>
            <Panel title="Sugerencias inteligentes" icon={Sparkles}>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Programa recordatorios en tu calendario para evitar atrasos. La automatización estará disponible próximamente.</li>
                <li>{includeDti && dti ? dti.lt(30) ? "Esta deuda mantiene un impacto menor al 30% de tus ingresos. Considera también tus otras obligaciones."
                  : "Esta cuota representa al menos el 30% de tus ingresos. Revisa tu capacidad de pago." : "Completa la simulación y tus ingresos para evaluar tu capacidad de pago."}</li>
                <li>Considera pagos extra para reducir intereses; confirma las condiciones de prepago con tu acreedor.</li>
              </ul>
            </Panel>
            <Panel title="Plantillas rápidas" icon={Layers}>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_TEMPLATES.map(({ category, label, rate, term, icon: Icon }) => <div key={category} className="space-y-1">
                  <Button type="button" variant="outline" className="w-full px-2 whitespace-normal" disabled={card} onClick={() => patch({ category, rate, term, method: "FixedInstallment" })}
                    title={`${rate}% anual · ${term} meses`}><Icon aria-hidden="true" />{label}</Button>
                  <p className="text-center text-xs text-muted-foreground">{rate}% · {term} meses</p>
                </div>)}
              </div>
            </Panel>
          </div>
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  </ResponsiveDrawer>;
}
