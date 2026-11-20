"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";

interface Props {
  title: string;
  description: string;
  formId: string;
  submitLabel: string;
  onClose: () => void;
  prepare: () => () => Promise<unknown>;
  children: React.ReactNode;
}
/** Validate before locking; never blindly retry a write whose response may have been lost. */
export function WorkspaceMutationDrawer({ title, description, formId, submitLabel, onClose, prepare, children }: Props) {
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current || uncertain) return;
    let operation: () => Promise<unknown>;
    try { operation = prepare(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Revisa los datos."); return; }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try { await operation(); onClose(); }
    catch { setUncertain(true); setError("No se pudo confirmar la operación. Cierra y actualiza los datos antes de volver a intentarlo."); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return <ResponsiveDrawer open title={title} description={description} onOpenChange={(open) => { if (!open && !inFlight.current) onClose(); }} hideCloseButton={saving} footer={<><Button variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="submit" form={formId} disabled={saving || uncertain} loading={saving}>{submitLabel}</Button></>}><form id={formId} onSubmit={submit} className="space-y-4"><fieldset disabled={saving || uncertain} className="space-y-4">{children}</fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form></ResponsiveDrawer>;
}
