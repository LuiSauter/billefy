"use client";
import React, { useEffect, useRef, useState } from "react";
import Decimal from "decimal.js";
import { AccountDto } from "../domain/ledger.types";
import { Movement } from "../domain/movement";
import { useUserCategories } from "../application/CategoriesContext";
import { LedgerApiRepository } from "../infrastructure/ledger-api.repository";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { Button } from "@/shared/ui/button";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SelectField } from "@/shared/ui/select-field";

interface Props {
  http: IHttpClient | null;
  movement: Movement;
  accounts: AccountDto[];
  auditMode?: boolean;
  onComplete: () => Promise<void>;
  reverseInvestmentCash?: (transactionId: string) => Promise<void>;
  onEdit?: () => void;
}
type Mode = "edit" | "duplicate" | "reverse" | null;
const decimalValid = (value: string) => { try { return value.trim() !== "" && new Decimal(value).isFinite() && new Decimal(value).gt(0); } catch { return false; } };

export function MovementActions({ http, movement, accounts, auditMode = false, onComplete, reverseInvestmentCash, onEdit }: Props) {
  const { categories } = useUserCategories();
  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState(""); const [accountId, setAccountId] = useState("");
  const [destinationId, setDestinationId] = useState(""); const [destinationAmount, setDestinationAmount] = useState("");
  const [description, setDescription] = useState(""); const [categoryId, setCategoryId] = useState("");
  const [pending, setPending] = useState(false); const pendingLock = useRef(false); const [error, setError] = useState("");
  const investment = movement.kind === "Investment";
  const ordinary = movement.kind !== "Transfer" && !investment;
  const sourceLeg = movement.legs.find((leg) => leg.direction === "Expense") || movement.legs[0];
  const targetLeg = movement.legs.find((leg) => leg.direction === "Income") || movement.legs[1];
  const sourceCurrency = accounts.find((account) => account.id === accountId)?.currency || sourceLeg?.currency || movement.currency;
  const destinationCurrency = accounts.find((account) => account.id === destinationId)?.currency || targetLeg?.currency || movement.currency;
  const start = (next: Mode) => {
    if (next === "edit" && onEdit) {
      onEdit();
      return;
    }
    setError(""); setMode(next); setAmount(movement.amount.toString()); setDescription(movement.description || "");
    setAccountId(sourceLeg?.accountId || movement.accountId); setCategoryId(movement.categoryId || "");
    setDestinationId(targetLeg?.accountId || ""); setDestinationAmount(targetLeg?.amount.toString() || "");
  };
  useEffect(() => { setMode(null); setError(""); }, [movement.id]);
  const run = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!http || pendingLock.current) return;
    pendingLock.current = true; setPending(true); setError("");
    try {
      const repo = new LedgerApiRepository(http);
      if (mode === "reverse") {
        if (investment) {
          if (!reverseInvestmentCash) throw new Error("No se pudo conectar con la inversión.");
          await reverseInvestmentCash(movement.id);
        } else await repo.reverseTransaction(movement.id, "Reversión solicitada por el usuario");
      }
      else {
        const duplicate = mode === "duplicate";
        if (ordinary) {
          const payload = { accountId, amount, direction: movement.direction as "Income" | "Expense", categoryId: categoryId || undefined, occurredAt: movement.occurredAt, description };
          if (duplicate) await repo.registerTransaction(payload); else await repo.updateTransaction(movement.id, payload);
        } else {
          const manualQuote = movement.rateSource === "Manual" ? { appliedRate: movement.appliedRate?.toString(), rateSource: "Manual" } : {};
          const payload = { sourceAccountId: accountId, sourceAmount: amount, destinationAccountId: destinationId, destinationAmount, ...manualQuote, description, occurredAt: movement.occurredAt };
          if (duplicate) await repo.registerTransfer(payload); else await repo.correctTransfer(movement.id, payload);
        }
      }
      setMode(null);
      await onComplete();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo completar la acción. El resultado puede ser desconocido; verifica el historial antes de intentarlo otra vez.");
    } finally { pendingLock.current = false; setPending(false); }
  };
  const title = mode === "reverse" ? "Confirmar reversión" : mode === "duplicate" ? "Duplicar transacción" : "Editar transacción";
  const close = () => { if (!pending) setMode(null); };
  if (movement.investmentCashKind === "Dividend") return <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
    Cobro vinculado a una inversión. No se puede editar, duplicar ni revertir por separado; consultá el historial de la inversión.
  </p>;
  if (movement.loanId) return <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
    Movimiento vinculado a un préstamo o tarjeta. No se puede editar, duplicar ni revertir por separado; consulta el detalle de la deuda.
  </p>;
  if (!movement.isReversal) return <div className="mt-4 border-t border-border pt-4"><h3 className="mb-2 text-sm font-semibold">Acciones</h3><div className="grid gap-2">
    {!investment && !auditMode && <Button variant="outline" className="w-full justify-start text-left" onClick={() => start("edit")}>Editar transacción</Button>}
    {!investment && <Button variant="outline" className="w-full justify-start text-left" onClick={() => start("duplicate")}>Duplicar</Button>}
    {!auditMode && <Button variant="destructive" className="w-full justify-start text-left" onClick={() => start("reverse")}>{investment ? "Revertir aporte/retiro" : "Revertir transacción"}</Button>}
    {investment && <p className="text-xs text-muted-foreground">El efectivo de inversión solo puede revertirse desde esta acción vinculada.</p>}
    {auditMode && <p className="text-xs text-muted-foreground">El historial es de solo lectura.</p>}
  </div>{mode && <ResponsiveDrawer open={mode !== null} onOpenChange={(open) => { if (!open) close(); }} title={title} size="md" hideCloseButton={pending} footer={<><Button type="button" variant="outline" disabled={pending} onClick={close}>Cancelar</Button><Button type="submit" form="movement-action-form" loading={pending} disabled={pending || (mode !== "reverse" && (!decimalValid(amount) || (!ordinary && (!destinationId || !decimalValid(destinationAmount)))))}>{pending ? "Guardando…" : mode === "reverse" ? "Confirmar reversión" : mode === "duplicate" ? "Guardar copia" : "Guardar cambios"}</Button></>}>
    <form id="movement-action-form" onSubmit={run} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        {mode === "reverse" ? <p className="text-sm text-muted-foreground">No se elimina ningún registro. Se creará una reversión contable.</p> : <>
          <FormGrid>
            <FormField label="Descripción">{(control) => <Input {...control} aria-label="Descripción" value={description} onChange={(event) => setDescription(event.target.value)} />}</FormField>
            <FormField label="Cuenta origen">{(control) => <SelectField {...control} aria-label="Cuenta origen" value={accountId} onChange={(event) => setAccountId(event.target.value)} options={accounts.map(a => ({ value: a.id, label: `${a.name} · ${a.currency}` }))} />}</FormField>
            <FormField label="Monto">{(control) => <MoneyInput {...control} aria-label="Monto" currency={sourceCurrency} maxDecimals={6} value={amount} onValueChange={setAmount} />}</FormField>
            {ordinary ? <FormField label="Categoría">{(control) => <SelectField {...control} aria-label="Categoría de movimiento" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} options={[{ value: "", label: "Sin categoría" }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />}</FormField> : <>
              <FormField label="Cuenta destino">{(control) => <SelectField {...control} aria-label="Cuenta destino" value={destinationId} onChange={(event) => setDestinationId(event.target.value)} options={accounts.map(a => ({ value: a.id, label: `${a.name} · ${a.currency}` }))} />}</FormField>
              <FormField label="Monto destino">{(control) => <MoneyInput {...control} aria-label="Monto destino" currency={destinationCurrency} maxDecimals={6} value={destinationAmount} onValueChange={setDestinationAmount} />}</FormField>
            </>}
          </FormGrid>
          {!ordinary && <p className="text-xs text-muted-foreground">Se conserva el tipo de cambio validado por el servidor; para cambiar cuentas, verifica los montos en ambas monedas.</p>}
        </>}
        {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error} No se reintentó automáticamente.</p>}
      </fieldset>
    </form>
  </ResponsiveDrawer>}</div>;
  return <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">Registro de auditoría: no se puede editar ni revertir nuevamente.</p>;
}
