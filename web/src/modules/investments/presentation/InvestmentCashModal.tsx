"use client";
import React, { useRef, useState } from "react";
import Decimal from "decimal.js";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { InvestmentsController } from "../application/useInvestments";

interface Props { open: boolean; onClose: () => void; controller: InvestmentsController; accounts: AccountDto[]; onComplete: () => Promise<void> }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export function InvestmentCashModal({ open, onClose, controller, accounts, onComplete }: Props) {
  const [investmentId, setInvestmentId] = useState(""); const [accountId, setAccountId] = useState(""); const [kind, setKind] = useState<"Contribution" | "Disposal">("Contribution");
  const [amount, setAmount] = useState(""); const [occurredAt, setOccurredAt] = useState(today); const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false); const lock = useRef(false);
  const close = () => { setInvestmentId(""); setAccountId(""); setKind("Contribution"); setAmount(""); setOccurredAt(today()); setDescription(""); setError(""); setSaved(false); lock.current = false; onClose(); };
  if (!open) return null;
  const investments = controller.investments.filter((i) => !(i as typeof i & { archivedAt?: string | null }).archivedAt);
  let validAmount = false;
  try { validAmount = /^\d+(?:\.\d+)?$/.test(amount.trim()) && new Decimal(amount.trim()).isFinite() && new Decimal(amount.trim()).gt(0); } catch { validAmount = false; }
  const valid = !!investmentId && !!accountId && !!occurredAt && validAmount;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!valid || lock.current || saved) return;
    lock.current = true; setPending(true); setError("");
    try {
      await controller.recordCash(investmentId, kind, { accountId, amount: amount.trim(), occurredAt: new Date(`${occurredAt}T12:00:00`).toISOString(), ...(description.trim() ? { description: description.trim() } : {}) });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el movimiento."); lock.current = false; setPending(false); return;
    }
    setSaved(true);
    try {
      await controller.refreshAfterCash();
      await onComplete();
      close();
    } catch {
      setError("El movimiento se guardó, pero no se pudieron actualizar los datos. No lo vuelvas a enviar; recarga la página para ver el resultado.");
    } finally { setPending(false); }
  };
  return <div role="dialog" aria-modal="true" aria-label="Registrar movimiento de inversión" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"><form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-card p-5 text-foreground"><h2 className="text-lg font-semibold">Movimiento de inversión</h2><p className="text-sm text-muted-foreground">El aporte o retiro afecta la cuenta elegida. No cambia el valor ni la cantidad de la inversión.</p>
    <label className="block text-sm">Activo<select aria-label="Activo" required value={investmentId} onChange={e=>setInvestmentId(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2"><option value="">Selecciona una inversión</option>{investments.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
    <label className="block text-sm">Cuenta de efectivo<select aria-label="Cuenta de efectivo" required value={accountId} onChange={e=>setAccountId(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2"><option value="">Selecciona una cuenta</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
    <label className="block text-sm">Tipo<select aria-label="Tipo de movimiento de inversión" value={kind} onChange={e=>setKind(e.target.value as typeof kind)} className="mt-1 w-full rounded border border-border bg-background p-2"><option value="Contribution">Aporte</option><option value="Disposal">Retiro</option></select></label>
    <label className="block text-sm">Monto (moneda de la cuenta)<input aria-label="Monto de inversión" required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2" placeholder="0.00" /></label>
    <label className="block text-sm">Fecha<input aria-label="Fecha del movimiento" type="date" required value={occurredAt} onChange={e=>setOccurredAt(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2" /></label>
    <label className="block text-sm">Descripción (opcional)<input aria-label="Descripción del movimiento de inversión" value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 w-full rounded border border-border bg-background p-2" /></label>
    {error&&<p role="alert" className="text-sm text-rose-400">{error}</p>}<div className="flex justify-end gap-2"><button type="button" disabled={pending} onClick={close} className="rounded border border-border px-3 py-2">Cancelar</button><button type="submit" disabled={!valid||pending||saved} className="rounded bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50">{pending?"Guardando…":saved?"Guardado":"Guardar movimiento"}</button></div>
  </form></div>;
}
