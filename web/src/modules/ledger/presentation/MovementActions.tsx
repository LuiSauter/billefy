"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Decimal from "decimal.js";
import { AccountDto, TransactionAllocationRequest } from "../domain/ledger.types";
import { Movement } from "../domain/movement";
import { useUserCategories } from "../application/CategoriesContext";
import { LedgerApiRepository } from "../infrastructure/ledger-api.repository";
import { IHttpClient } from "@/shared/application/http-client.contract";

interface Props { http: IHttpClient | null; movement: Movement; accounts: AccountDto[]; auditMode?: boolean; onComplete: () => Promise<void>; reverseInvestmentCash?: (transactionId: string) => Promise<void> }
type Mode = "edit" | "duplicate" | "split" | "reverse" | null;
const decimalValid = (value: string) => { try { return value.trim() !== "" && new Decimal(value).isFinite() && new Decimal(value).gt(0); } catch { return false; } };

export function MovementActions({ http, movement, accounts, auditMode = false, onComplete, reverseInvestmentCash }: Props) {
  const { categories } = useUserCategories();
  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState(""); const [accountId, setAccountId] = useState("");
  const [destinationId, setDestinationId] = useState(""); const [destinationAmount, setDestinationAmount] = useState("");
  const [description, setDescription] = useState(""); const [categoryId, setCategoryId] = useState("");
  const [allocations, setAllocations] = useState<Array<{ categoryId: string; amount: string }>>([]);
  const [pending, setPending] = useState(false); const pendingLock = useRef(false); const [error, setError] = useState("");
  const investment = movement.kind === "Investment";
  const ordinary = movement.kind !== "Transfer" && !investment;
  const sourceLeg = movement.legs.find((leg) => leg.direction === "Expense") || movement.legs[0];
  const targetLeg = movement.legs.find((leg) => leg.direction === "Income") || movement.legs[1];
  const total = useMemo(() => allocations.reduce((sum, row) => { try { return sum.plus(row.amount || "0"); } catch { return sum; } }, new Decimal(0)), [allocations]);
  const validSplit = allocations.length > 0 && allocations.every((row) => row.categoryId && decimalValid(row.amount)) && total.eq(movement.amount);
  const start = (next: Mode) => {
    setError(""); setMode(next); setAmount(movement.amount.toString()); setDescription(movement.description || "");
    setAccountId(sourceLeg?.accountId || movement.accountId); setCategoryId(movement.categoryId || "");
    setDestinationId(targetLeg?.accountId || ""); setDestinationAmount(targetLeg?.amount.toString() || "");
    setAllocations(movement.allocations.map((a) => ({ categoryId: a.categoryId, amount: a.amount.toString() })));
  };
  useEffect(() => { setMode(null); setError(""); }, [movement.id]);
  const run = async () => {
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
        const split = mode === "split";
        const allocationPayload: TransactionAllocationRequest[] | undefined = split || allocations.length ? allocations.map((a) => ({ categoryId: a.categoryId, amount: a.amount })) : undefined;
        if (ordinary) {
          const payload = { accountId, amount, direction: movement.direction as "Income" | "Expense", categoryId: allocationPayload?.length ? undefined : (categoryId || undefined), occurredAt: movement.occurredAt, description, allocations: allocationPayload };
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
  const addAllocation = () => setAllocations((rows) => [...rows, { categoryId: "", amount: "" }]);
  if (!movement.isReversal) return <div className="mt-4 border-t border-border pt-4"><h3 className="mb-2 text-sm font-semibold">Acciones</h3><div className="grid gap-2">
    {!investment && !auditMode && <button className="rounded-xl border border-border bg-card/60 px-3 py-2.5 text-left text-sm font-medium transition hover:bg-muted" onClick={() => start("edit")}>Editar movimiento</button>}
    {!investment && <button className="rounded-xl border border-border bg-card/60 px-3 py-2.5 text-left text-sm font-medium transition hover:bg-muted" onClick={() => start("duplicate")}>Duplicar</button>}
    {!investment && !auditMode && ordinary && <button className="rounded-xl border border-border bg-card/60 px-3 py-2.5 text-left text-sm font-medium transition hover:bg-muted" onClick={() => start("split")}>Dividir en categorías</button>}
    {!auditMode && <button className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-left text-sm font-medium text-rose-400 transition hover:bg-rose-500/20" onClick={() => start("reverse")}>{investment ? "Revertir aporte/retiro" : "Revertir movimiento"}</button>}
    {investment && <p className="text-xs text-muted-foreground">El efectivo de inversión solo puede revertirse desde esta acción vinculada.</p>}
    {auditMode && <p className="text-xs text-muted-foreground">El historial es de solo lectura.</p>}
  </div>{mode && <div role="dialog" aria-modal="true" aria-label={mode === "reverse" ? "Confirmar reversión" : mode === "duplicate" ? "Duplicar movimiento" : mode === "split" ? "Dividir movimiento" : "Editar movimiento"} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"><div className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-auto rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">{mode === "reverse" ? "¿Revertir movimiento?" : mode === "duplicate" ? "Duplicar movimiento" : mode === "split" ? "Dividir en categorías" : "Editar movimiento"}</h2>{mode === "reverse" ? <p className="text-sm text-muted-foreground">No se elimina ningún registro. Se creará una reversión contable; en transferencias se revierten ambas cuentas en una sola operación.</p> : <>
      <label className="block text-sm">Descripción<input aria-label="Descripción" className="mt-1 w-full rounded border border-border bg-background p-2" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <label className="block text-sm">Cuenta origen<select aria-label="Cuenta origen" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2">{accounts.map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
      <label className="block text-sm">Monto<input aria-label="Monto" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2" /></label>
      {ordinary ? mode !== "split" && <label className="block text-sm">Categoría<select aria-label="Categoría de movimiento" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2"><option value="">Sin categoría</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label> : <><label className="block text-sm">Cuenta destino<select aria-label="Cuenta destino" value={destinationId} onChange={(e) => setDestinationId(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2">{accounts.map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label><label className="block text-sm">Monto destino<input aria-label="Monto destino" inputMode="decimal" value={destinationAmount} onChange={(e) => setDestinationAmount(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2" /></label><p className="text-xs text-muted-foreground">Se conserva el tipo de cambio validado por el servidor; para cambiar cuentas, verifica los montos en ambas monedas.</p></>}
      {(mode === "split" || allocations.length > 0) && <section aria-label="Asignaciones" className="space-y-2"><p className="text-sm">Asignaciones (monto total: {total.toString()} / {movement.amount.toString()} {movement.currency})</p>{allocations.map((row, index) => <div key={index} className="grid grid-cols-2 gap-2"><select aria-label={`Categoría asignación ${index + 1}`} value={row.categoryId} onChange={(e) => setAllocations(rows => rows.map((x,i)=>i===index?{...x,categoryId:e.target.value}:x))} className="rounded border border-border bg-background p-2"><option value="">Categoría</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input aria-label={`Monto asignación ${index + 1}`} inputMode="decimal" value={row.amount} onChange={(e)=>setAllocations(rows=>rows.map((x,i)=>i===index?{...x,amount:e.target.value}:x))} className="rounded border border-border bg-background p-2" /></div>)}<button type="button" className="text-sm underline" onClick={addAllocation}>Agregar categoría</button><p className="text-xs text-muted-foreground">Montos positivos exactos, en {movement.currency}; deben sumar exactamente el movimiento.</p></section>}
      </>}{error&&<p role="alert" className="text-sm text-rose-400">{error} No se reintentó automáticamente.</p>}<div className="flex justify-end gap-2"><button disabled={pending} className="rounded border border-border px-3 py-2" onClick={()=>setMode(null)}>Cancelar</button><button disabled={pending || (mode !== "reverse" && (!decimalValid(amount) || (mode === "split" && !validSplit) || (!ordinary && (!destinationId || !decimalValid(destinationAmount)))))} className="rounded bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50" onClick={run}>{pending?"Guardando…":mode==="reverse"?"Confirmar reversión":mode==="duplicate"?"Guardar copia":"Guardar cambios"}</button></div></div></div>}</div>;
  return <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">Registro de auditoría: no se puede editar ni revertir nuevamente.</p>;
}
