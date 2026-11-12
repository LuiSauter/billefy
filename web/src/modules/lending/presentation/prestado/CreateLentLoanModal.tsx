"use client";

import React, { useEffect, useRef, useState } from "react";
import Decimal from "decimal.js";
import { CalendarDays, HandCoins, UserRound } from "lucide-react";
import type { AccountDto } from "@/modules/ledger/domain/ledger.types";
import type { CreateLoanRequest, EarlyPaymentPolicy, LoanScheduleDto, SimulateLoanRequest } from "../../domain/lending.types";
import { EARLY_PAYMENT_POLICY_OPTIONS, getCompatibleEarlyPaymentPolicies } from "../../domain/lending.types";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { SelectField } from "@/shared/ui/select-field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Textarea } from "@/shared/ui/textarea";
import { Amount } from "@/shared/ui/amount";

export interface CreateLentLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountDto[];
  selectedCurrency?: string;
  onSimulate?: (req: SimulateLoanRequest) => Promise<LoanScheduleDto>;
  onSubmit: (req: CreateLoanRequest) => Promise<unknown>;
}

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const FORM_ID = "create-lent-loan-form";
const RELATIONSHIPS = ["Amigo", "Familia", "Trabajo", "Cliente", "Otro"];
const FREQUENCIES = [
  { value: "Monthly", label: "Mensual" }, { value: "Biweekly", label: "Quincenal" }, { value: "Weekly", label: "Semanal" },
];
type Frequency = "Monthly" | "Biweekly" | "Weekly";
function initialForm(currency = "BOB") {
  return { person: "", relationship: "Amigo", account: "", principal: "", currency,
    date: new Date().toISOString().slice(0, 10), agreement: "interest" as "interest" | "none",
    rate: "10", frequency: "Monthly" as Frequency, term: "6", notes: "", plan: "automatic" as "automatic" | "manual",
    earlyPaymentPolicy: "AdvanceInstallments" as EarlyPaymentPolicy };
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
function maturity(date: string, count: number, frequency: Frequency) {
  if (!validDate(date) || !Number.isSafeInteger(count) || count < 1) return "";
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(start);
  if (frequency === "Monthly") {
    end.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + count);
    const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(start.getUTCDate(), lastDay));
  } else {
    end.setUTCDate(end.getUTCDate() + count * (frequency === "Biweekly" ? 15 : 7));
  }
  return Number.isFinite(end.getTime()) && end.getUTCFullYear() <= 9999 ? end.toISOString().slice(0, 10) : "";
}
function validSchedule(schedule: LoanScheduleDto) {
  return Array.isArray(schedule?.installments) && schedule.installments.length > 0 &&
    [schedule.totalPrincipal, schedule.totalInterest, schedule.totalToPay, schedule.annualEffectiveRate,
      ...schedule.installments.flatMap(item => [item.principal, item.interest, item.total, item.balanceAfter])]
      .every(value => typeof value === "number" && decimal(value) !== null) &&
    schedule.installments.every((item, index) => item.number === index + 1 && validDate(item.dueDate));
}
type Simulation = { key: string; source: CreateLentLoanModalProps["onSimulate"];
  status: "loading" | "ready" | "error"; schedule?: LoanScheduleDto };
function Panel({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return <Card className="min-w-0 space-y-4 p-4">
    <h3 className="flex items-center gap-2 font-bold"><Icon aria-hidden="true" className="size-5 text-primary" />{title}</h3>
    {children}
  </Card>;
}

export function CreateLentLoanModal({ isOpen, onClose, accounts, selectedCurrency = "BOB", onSimulate, onSubmit }: CreateLentLoanModalProps) {
  const currency = ["USD", "USDT"].includes(selectedCurrency.toUpperCase()) ? "USD" : "BOB";
  const [form, setForm] = useState(() => initialForm(currency));
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const session = useRef(0);
  const patch = (values: Partial<typeof form>) => setForm(current => ({ ...current, ...values }));
  const principal = decimal(form.principal);
  const rate = form.agreement === "none" ? new D(0) : decimal(form.rate)?.div(100);
  const months = Number(form.term);
  // Thirty360 nominal periods: 30 days/month, 15 days/fortnight, 7 days/week.
  const count = form.frequency === "Monthly" ? months : Math.ceil(months * 30 / (form.frequency === "Biweekly" ? 15 : 7));
  const dueDate = maturity(form.date, count, form.frequency);
  const validTerms = Boolean(principal?.gt(0) && principal.decimalPlaces() <= 2 && rate &&
    Number.isSafeInteger(months) && months > 0 && FREQUENCIES.some(item => item.value === form.frequency) && dueDate);
  const account = accounts.find(item => item.id === form.account && item.currency === form.currency);
  const isValid = validTerms && Boolean(account) && ["BOB", "USD"].includes(form.currency) &&
    form.person.trim().length > 0 && form.person.trim().length <= 150 && form.notes.length <= 300 && RELATIONSHIPS.includes(form.relationship);
  const template = form.agreement === "none" ? "NoInterest" : "FixedInstallment";
  const requestKey = validTerms ? JSON.stringify({ principal: principal!.toNumber(), rate: rate!.toNumber(), rateUnit: "Annual",
    dayCount: "Thirty360", frequency: form.frequency, template, totalInstallments: count, disbursementDate: form.date } satisfies SimulateLoanRequest) : "";

  useEffect(() => {
    session.current += 1;
    return () => { session.current += 1; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setForm(initialForm(currency)); setSimulation(null); setError(""); setSubmitting(false); submitLock.current = false;
    }
    // Currency changes while editing must not silently reset entered data.
  }, [isOpen, currency]);

  useEffect(() => {
    setSimulation(null);
    if (!isOpen || !onSimulate || !requestKey) return;
    let active = true;
    setSimulation({ key: requestKey, source: onSimulate, status: "loading" });
    const timer = setTimeout(async () => {
      try {
        const result = await onSimulate(JSON.parse(requestKey) as SimulateLoanRequest);
        if (!validSchedule(result)) throw new Error("Invalid schedule");
        if (active) setSimulation({ key: requestKey, source: onSimulate, status: "ready", schedule: result });
      } catch {
        if (active) setSimulation({ key: requestKey, source: onSimulate, status: "error" });
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [isOpen, onSimulate, requestKey]);

  const current = simulation?.key === requestKey && simulation.source === onSimulate ? simulation : null;
  const schedule = current?.status === "ready" ? current.schedule : undefined;
  const simulationMessage = !onSimulate ? "Simulación no disponible: conecta el cálculo del servidor para ver el calendario."
    : !validTerms ? "Completa monto, tasa, plazo y fecha para simular."
      : current?.status === "error" ? "No se pudo simular. Modifica las condiciones para reintentar." : "Calculando calendario…";
  const close = () => { if (!submitLock.current) onClose(); };
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isOpen || !isValid || submitLock.current) return;
    const activeSession = session.current;
    submitLock.current = true; setSubmitting(true); setError("");
    const counterpartyNotes = [`[Plan: ${form.plan === "manual" ? "Manual" : "Automático"}]`, `Relación: ${form.relationship}`,
      ...(form.notes.trim() ? [`Descripción: ${form.notes.trim()}`] : [])].join("\n");
    try {
      await onSubmit({ type: "Lent", counterpartyName: form.person.trim(), principal: principal!.toNumber(), currency: form.currency,
        interestRate: rate!.toNumber(), rateUnit: "Annual", dayCount: "Thirty360", frequency: form.frequency, template,
        totalInstallments: count, disbursementDate: form.date, disbursementAccountId: account!.id, counterpartyNotes,
        earlyPaymentPolicy: form.earlyPaymentPolicy });
    } catch {
      if (session.current === activeSession) {
        setError("No se pudo registrar el préstamo. Tus datos se conservaron; inténtalo de nuevo.");
        submitLock.current = false; setSubmitting(false);
      }
      return;
    }
    // Retain the write lock after success until close to prevent duplicate loans.
    if (session.current === activeSession) { setSubmitting(false); onClose(); }
  }

  return <ResponsiveDrawer open={isOpen} onOpenChange={open => { if (!open) close(); }} size="xl"
    title="Registrar préstamo (dinero prestado)" description="Registra un nuevo préstamo que le hiciste a alguien y lleva el control de sus pagos."
    footer={<>
      <Button type="button" variant="outline" disabled={submitting} onClick={close}>Cancelar</Button>
      <Button type="submit" form={FORM_ID} disabled={!isValid || submitting} loading={submitting}>Registrar préstamo</Button>
    </>}>
    <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4" aria-busy={submitting}>
      <fieldset disabled={submitting} className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Panel title="Información del préstamo" icon={UserRound}>
            <FormGrid>
              <FormField htmlFor="lent-person" label="Persona o contacto" required>{control =>
                <Input {...control} required maxLength={150} value={form.person} onChange={e => patch({ person: e.target.value })} />}</FormField>
              <FormField htmlFor="lent-relationship" label="Relación">{control =>
                <SelectField {...control} value={form.relationship} onChange={e => patch({ relationship: e.target.value })}
                  options={RELATIONSHIPS.map(value => ({ value, label: value }))} />}</FormField>
              <FormField htmlFor="lent-account" label="Cuenta de origen" required>{control =>
                <SelectField {...control} required value={form.account} placeholder="Selecciona una cuenta" onChange={e => patch({ account: e.target.value })}
                  options={accounts.filter(item => item.currency === form.currency).map(item => ({ value: item.id, label: item.name }))} />}</FormField>
              <FormField htmlFor="lent-currency" label="Moneda">{control =>
                <SelectField {...control} value={form.currency} onChange={e => patch({ currency: e.target.value, account: "" })}
                  options={[{ value: "BOB", label: "Bolivianos (BOB)" }, { value: "USD", label: "Dólares (USD)" }]} />}</FormField>
              <FormField htmlFor="lent-principal" label="Monto prestado" required>{control =>
                <MoneyInput {...control} required value={form.principal} currency={form.currency}
                  onValueChange={principal => patch({ principal })} />}</FormField>
              <FormField htmlFor="lent-date" label="Fecha del préstamo" required>{control =>
                <Input {...control} required type="date" value={form.date} onChange={e => patch({ date: e.target.value })} />}</FormField>
            </FormGrid>
            {!accounts.some(item => item.currency === form.currency) && <p role="status" className="text-sm text-muted-foreground">
              No hay cuentas en {form.currency}. Crea una cuenta compatible para registrar el préstamo.</p>}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Tipo de acuerdo</p>
              <SegmentedControl aria-label="Tipo de acuerdo" value={form.agreement} disabled={submitting}
                onChange={agreement => patch({ agreement })} options={[{ value: "interest", label: "Con interés" }, { value: "none", label: "Sin interés" }]}
                className="max-w-full overflow-x-auto" />
            </div>
            <FormGrid>
              {form.agreement === "interest" && <FormField htmlFor="lent-rate" label="Tasa de interés anual (%)" required>{control =>
                <Input {...control} required type="number" min="0" step="0.01" value={form.rate} onChange={e => patch({ rate: e.target.value })} />}</FormField>}
              <FormField htmlFor="lent-frequency" label="Periodicidad">{control =>
                <SelectField {...control} value={form.frequency} options={FREQUENCIES} onChange={e => patch({ frequency: e.target.value as Frequency })} />}</FormField>
              <FormField htmlFor="lent-term" label="Plazo (meses)" required hint="Quincenas de 15 días y semanas de 7 días; se redondea al siguiente período completo.">{control =>
                <Input {...control} required type="number" min="1" step="1" value={form.term} onChange={e => patch({ term: e.target.value })} />}</FormField>
              <FormField htmlFor="lent-due" label="Fecha de vencimiento" hint="Calculada según la fecha, el plazo y la periodicidad.">{control =>
                <Input {...control} readOnly type="date" value={schedule?.installments.at(-1)?.dueDate ?? dueDate} />}</FormField>
            </FormGrid>
            <FormField htmlFor="lent-notes" label="Descripción / Notas" hint={`${form.notes.length} / 300`}>{control =>
              <Textarea {...control} rows={3} maxLength={300} value={form.notes} onChange={e => patch({ notes: e.target.value })} />}</FormField>
          </Panel>
          <Panel title="Plan de pagos" icon={CalendarDays}>
            <SegmentedControl aria-label="Plan de pagos" value={form.plan} disabled={submitting} onChange={plan => patch({ plan })}
              options={[{ value: "automatic", label: "Crear plan automático" }, { value: "manual", label: "Registrar pagos manualmente" }]}
              className="flex max-w-full flex-col lg:flex-row [&>button]:whitespace-normal" />
            <p className="text-sm text-muted-foreground">{form.plan === "manual"
              ? "En modo manual registrarás los pagos a medida que los recibas. El servidor controla el saldo mediante el cronograma de amortización estándar; esta preferencia no lo elimina."
              : "Genera las cuotas según el monto, el interés y el plazo. Los cobros se confirman al recibirlos; no se registran automáticamente."}</p>
            <FormField htmlFor="lent-early-policy" label="Política ante cobros mayores o anticipados"
              hint={EARLY_PAYMENT_POLICY_OPTIONS.find(p => p.value === form.earlyPaymentPolicy)?.description}>
              {control => (
                <SelectField
                  {...control}
                  id="lent-early-policy"
                  value={form.earlyPaymentPolicy}
                  options={getCompatibleEarlyPaymentPolicies(template).map(p => ({ value: p.value, label: p.label }))}
                  onChange={e => patch({ earlyPaymentPolicy: e.target.value as EarlyPaymentPolicy })}
                />
              )}
            </FormField>
          </Panel>
        </div>
        <div className="min-w-0 space-y-4" aria-live="polite">
          <Panel title="Resumen del préstamo" icon={HandCoins}>
            <dl className="space-y-3 text-sm">
              {[["Monto prestado", principal ? <Amount value={principal} currency={form.currency} size="sm" /> : "—"],
                ["Interés total", schedule ? <Amount value={schedule.totalInterest} currency={form.currency} size="sm" /> : "—"],
                ["Total a recibir", schedule ? <Amount value={schedule.totalToPay} currency={form.currency} size="sm" /> : "—"],
                ["Plazo", Number.isSafeInteger(months) && months > 0 ? `${months} meses` : "—"],
                [form.frequency === "Monthly" ? "Cuota mensual estimada" : "Cuota por período estimada",
                  schedule ? <Amount value={schedule.installments[0].total} currency={form.currency} size="sm" /> : "—"]].map(([label, value]) =>
                <div key={String(label)} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2">
                  <dt className="text-muted-foreground">{label}</dt><dd className="font-semibold">{value}</dd>
                </div>)}
            </dl>
          </Panel>
          <Panel title="Calendario de pagos (estimado)" icon={CalendarDays}>
            {!schedule ? <p role={current?.status === "error" ? "alert" : "status"} className="text-sm text-muted-foreground">{simulationMessage}</p>
              : <Table aria-label="Calendario de pagos estimado">
                <TableHeader><TableRow><TableHead scope="col">#</TableHead><TableHead scope="col">Fecha de pago</TableHead><TableHead scope="col" className="text-right">Monto</TableHead></TableRow></TableHeader>
                <TableBody>{schedule.installments.map(item => <TableRow key={item.number}>
                  <TableCell>{item.number}</TableCell><TableCell><time dateTime={item.dueDate}>{item.dueDate}</time></TableCell>
                  <TableCell className="text-right"><Amount value={item.total} currency={form.currency} size="sm" /></TableCell>
                </TableRow>)}</TableBody>
              </Table>}
          </Panel>
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  </ResponsiveDrawer>;
}
