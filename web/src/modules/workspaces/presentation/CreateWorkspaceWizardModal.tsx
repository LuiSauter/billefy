"use client";

import React, { useRef, useState } from "react";
import Decimal from "decimal.js";
import { Check, Info, Lightbulb, Plus, ShieldCheck, UserPlus, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { FormField, FormGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { MoneyInput } from "@/shared/ui/money-input";
import { SelectField } from "@/shared/ui/select-field";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { createWorkspaceDraft, isInviteEmail, saveWorkspaceDraft, splitRules, validateWorkspaceDraft, workspaceContributionPreview, workspaceTypes, type CreationCheckpoint, type WorkspaceCreationServices, type WorkspaceDraft } from "./workspace-creation";
import { getBrowserDraftStorage, markWorkspaceDraftConsumed, readWorkspaceDraft, removeWorkspaceDraft, writeWorkspaceDraft } from "./workspace-draft-storage";
import { WorkspaceIcon, workspaceColors, workspaceIcons, workspaceMoney, workspacePanel } from "./workspace-ui";

const steps = ["Información básica", "Integrantes", "Reglas y aportes", "Confirmación"];
const privacyLabels = {
  hidePersonalPatrimony: "Ocultar patrimonio personal",
  memberSeesOnlyShared: "Solo lo compartido",
  showIndividualContributions: "Aportes individuales",
  allowMovementComments: "Comentarios en movimientos",
} as const;

type StepProps = { step: number; draft: WorkspaceDraft; onChange: (patch: Partial<WorkspaceDraft>) => void };

export function WorkspaceWizardStep({ step, draft, onChange }: StepProps) {
  const [inviteError, setInviteError] = useState<string | null>(null);
  const addInvite = () => {
    const email = draft.inviteEmail.trim().toLowerCase();
    if (!isInviteEmail(email)) { setInviteError("Escribe un correo válido."); return; }
    if (draft.emails.includes(email)) { setInviteError("Este correo ya está en la lista."); return; }
    onChange({ emails: [...draft.emails, email], inviteEmail: "" });
    setInviteError(null);
  };
  if (step === 0) return <section className={`${workspacePanel} space-y-4`}>
    <div><h3 className="font-bold">1. Información del espacio</h3><p className="text-xs text-muted-foreground">Define los datos principales de tu espacio compartido.</p></div>
    <FormGrid>
      <FormField label="Nombre del espacio" required>{(control) => <Input {...control} required maxLength={120} value={draft.name} placeholder="Ej. Nuestro hogar" onChange={(event) => onChange({ name: event.target.value })} />}</FormField>
      <FormField label="Tipo de espacio" required>{(control) => <SelectField {...control} value={draft.workspaceType} options={workspaceTypes} onChange={(event) => onChange({ workspaceType: event.target.value as WorkspaceDraft["workspaceType"] })} />}</FormField>
      <FormField label="Descripción" hint={`${draft.description.length} / 200`}>{(control) => <Textarea {...control} maxLength={200} value={draft.description} placeholder="¿Qué quieren organizar juntos?" onChange={(event) => onChange({ description: event.target.value })} />}</FormField>
      <FormField label="Moneda base" required>{(control) => <SelectField {...control} value={draft.baseCurrency} options={[{ value: "BOB", label: "BOB · Bolivianos" }, { value: "USD", label: "USD · Dólares" }]} onChange={(event) => onChange({ baseCurrency: event.target.value })} />}</FormField>
      <FormField label="Fecha de inicio" required hint="Fecha planificada del espacio; no cambia el período del presupuesto ni los movimientos.">{(control) => <Input {...control} type="date" required value={draft.startDate} onChange={(event) => onChange({ startDate: event.target.value })} />}</FormField>
    </FormGrid>
    <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Color / icono del espacio</legend>
      <div className="flex flex-wrap gap-2">{Object.entries(workspaceIcons).map(([name, Icon]) => <Button key={name} type="button" variant={draft.icon === name ? "secondary" : "outline"} size="icon" aria-label={`Icono ${name}`} aria-pressed={draft.icon === name} onClick={() => onChange({ icon: name })}><Icon /></Button>)}</div>
      <div className="flex gap-2">{Object.entries(workspaceColors).map(([name, classes]) => <Button key={name} type="button" variant="outline" className={classes} aria-pressed={draft.color === name} onClick={() => onChange({ color: name })}>{name === "violet" ? "Violeta" : name === "emerald" ? "Verde" : "Ámbar"}{draft.color === name && <Check />}</Button>)}</div>
    </fieldset>
    <label className="flex items-center gap-3 text-sm"><Switch checked={draft.isActive} onCheckedChange={(isActive) => onChange({ isActive })} /><span><strong>Espacio activo</strong><span className="block text-xs text-muted-foreground">Permite registrar movimientos y colaborar con los integrantes.</span></span></label>
    {!draft.isActive && <p className="text-xs text-amber-500">El espacio se creará y luego se desactivará. No aparecerá en el hub y la API actual no permite reactivarlo.</p>}
  </section>;

  if (step === 1) return <div className="space-y-4">
    <section className={`${workspacePanel} space-y-4`}><h3 className="font-bold">Privacidad y visibilidad</h3><p className="text-xs text-muted-foreground">Las cuentas y el patrimonio personal nunca se comparten.</p>
      <div className="grid gap-4 sm:grid-cols-2">{Object.entries(privacyLabels).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><Switch checked={draft.settings[key as keyof typeof privacyLabels]} onCheckedChange={(checked) => onChange({ settings: { ...draft.settings, [key]: checked } })} /></label>)}</div>
    </section>
    <section className={`${workspacePanel} space-y-4`}><h3 className="font-bold">Integrantes</h3>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"><UserPlus className="size-5 text-primary" /><span className="flex-1 text-sm font-semibold">Tú</span><Badge>Propietario</Badge></div>
      {draft.emails.map((email) => <div key={email} className="grid grid-cols-[minmax(0,1fr)_9rem_auto] items-center gap-2 rounded-xl border border-border p-3 text-sm"><span className="min-w-0 break-all">{email} · invitación pendiente</span><FormField label={`Rol para ${email}`}><SelectField value={draft.invitationRoles[email] ?? "Member"} options={[{ value: "Member", label: "Miembro" }, { value: "Admin", label: "Administrador" }]} onChange={(event) => onChange({ invitationRoles: { ...draft.invitationRoles, [email]: event.target.value as "Member" | "Admin" } })} /></FormField><Button type="button" variant="ghost" size="icon-sm" aria-label={`Quitar ${email}`} onClick={() => onChange({ emails: draft.emails.filter((value) => value !== email) })}><X /></Button></div>)}
      <FormField label="Invitar por correo" error={inviteError} hint="Las invitaciones se enviarán al crear el espacio. Se unirán como miembros.">{(control) => <div className="flex flex-col gap-2 sm:flex-row"><Input {...control} type="email" placeholder="nombre@correo.com" value={draft.inviteEmail} onChange={(event) => { onChange({ inviteEmail: event.target.value }); setInviteError(null); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addInvite(); } }} /><Button type="button" variant="outline" onClick={addInvite}><Plus />Agregar integrante</Button></div>}</FormField>
    </section>
  </div>;

  if (step === 2) return <section className={`${workspacePanel} space-y-4`}>
    <div><h3 className="font-bold">Reglas de aportes</h3><p className="text-xs text-muted-foreground">Explora cómo distribuir los aportes y el presupuesto compartido.</p></div>
    <div className="grid gap-2 sm:grid-cols-2">{splitRules.map((rule) => <Button key={rule.value} type="button" variant={draft.splitRule === rule.value ? "secondary" : "outline"} className="h-auto justify-start whitespace-normal p-3 text-left" aria-pressed={draft.splitRule === rule.value} onClick={() => onChange({ splitRule: rule.value })}><span><strong className="block">{rule.label}</strong><span className="text-xs font-normal text-muted-foreground">{rule.description}</span></span>{draft.splitRule === rule.value && <Check className="ml-auto" />}</Button>)}</div>
    <div className="space-y-3"><h4 className="text-sm font-semibold">Aportes planificados · {draft.splitRule === "ByResponsibility" ? "pesos" : "porcentajes"}</h4>
      {workspaceContributionPreview(draft).map((member) => {
        const owner = member.label === "Tú";
        const email = member.label;
        const field = draft.splitRule === "IncomeProportional" ? "incomeSharePercentage" : draft.splitRule === "ByResponsibility" ? "responsibilityWeight" : "customSharePercentage";
        const value = owner ? (field === "incomeSharePercentage" ? draft.ownerIncomeSharePercentage : field === "customSharePercentage" ? draft.ownerCustomSharePercentage : draft.ownerResponsibilityWeight) || member.percentage
          : draft.invitationShares[email]?.[field] ?? member.percentage;
        return <div key={member.label} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3"><span className="min-w-0 break-all text-xs">{owner ? "Tú · propietario activo" : `${email} · invitación pendiente`}</span><FormField label={owner ? "Tu valor" : `Aporte de ${email}`}><Input type="text" inputMode="decimal" value={value} onChange={(event) => owner
          ? onChange(field === "incomeSharePercentage" ? { ownerIncomeSharePercentage: event.target.value } : field === "customSharePercentage" ? { ownerCustomSharePercentage: event.target.value } : { ownerResponsibilityWeight: event.target.value })
          : onChange({ invitationShares: { ...draft.invitationShares, [email]: { ...draft.invitationShares[email], [field]: event.target.value } } })} /></FormField></div>;
      })}
    </div>
    {draft.splitRule === "IncomeProportional" && <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Define manualmente los porcentajes planeados. No se consultan ni se comparten ingresos personales.</p>}
    <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Las finanzas personales permanecen privadas; no se comparten ni se consultan ingresos personales.</p>
    <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground"><Info className="mr-1 inline size-4" />La regla deseada se guardará. Mientras las invitaciones sigan pendientes, la distribución efectiva puede ser partes iguales entre integrantes activos.</p>
    <FormField label="Presupuesto mensual · mes actual (UTC)" hint="Opcional. Se guardará para el mes actual (UTC), en la moneda base; la fecha de inicio no cambia este período.">{(control) => <MoneyInput {...control} value={draft.budget} onValueChange={(budget) => onChange({ budget })} currency={draft.baseCurrency} />}</FormField>
    <fieldset><legend className="mb-2 text-sm font-semibold">Categorías sugeridas</legend><div className="flex flex-wrap gap-2">{["Alquiler", "Alimentación", "Servicios", "Transporte", "Ocio"].map((category) => <Button key={category} type="button" size="xs" variant={draft.categories.includes(category) ? "secondary" : "outline"} aria-pressed={draft.categories.includes(category)} onClick={() => onChange({ categories: draft.categories.includes(category) ? draft.categories.filter((value) => value !== category) : [...draft.categories, category] })}>{category}{draft.categories.includes(category) && <Check />}</Button>)}</div><p className="mt-2 text-xs text-muted-foreground">Referencia para planificar; no crea categorías ni límites automáticamente.</p></fieldset>
  </section>;

  return <section className={`${workspacePanel} space-y-4`}>
    <h3 className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5 text-primary" />Permisos del espacio</h3>
    <p className="text-xs text-muted-foreground">Revisa los permisos de cada rol antes de crear el espacio. Los invitados ingresan como miembros. Los miembros solo pueden registrar liquidaciones en las que son pagadores.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Permisos por rol</caption><thead><tr className="border-b border-border">{["Rol", "Editar presupuesto", "Registrar gastos", "Invitar personas", "Liquidar saldos"].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{[["Propietario", true, true, true, true], ["Administrador", true, true, true, true], ["Miembro", false, true, false, true]].map(([role, ...permissions]) => <tr key={String(role)} className="border-b border-border"><th className="p-2 font-medium">{role}</th>{permissions.map((allowed, index) => <td key={index} className="p-2"><span className={allowed ? "text-emerald-500" : "text-muted-foreground"}>{allowed ? "Sí" : "No"}</span></td>)}</tr>)}</tbody></table></div>
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm"><strong>{draft.name || "Tu espacio compartido"}</strong><p className="mt-1 text-muted-foreground">1 propietario activo + {new Set(draft.emails.map((email) => email.trim().toLowerCase()).filter(Boolean)).size} invitación(es) pendiente(s) · {draft.baseCurrency} · {draft.isActive ? "Activo" : "Inactivo"}</p><p className="mt-2">Solo se compartirán los movimientos registrados en este espacio.</p></div>
  </section>;
}

interface Props { open: boolean; onOpenChange: (open: boolean) => void; services: WorkspaceCreationServices; onCreated: (id: string) => void; userId?: string | null; }
export function CreateWorkspaceWizardModal({ open, onOpenChange, services, onCreated, userId }: Props) {
  const [draft, setDraft] = useState(createWorkspaceDraft);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creationUncertain, setCreationUncertain] = useState(false);
  const [checkpoint, setCheckpoint] = useState<CreationCheckpoint | null>(null);
  const [storageNotice, setStorageNotice] = useState<string | null>(userId ? null : "Inicia sesión para guardar un borrador local privado en este navegador.");
  const inFlight = useRef(false);
  const change = (patch: Partial<WorkspaceDraft>) => { setDraft((current) => ({ ...current, ...patch })); setError(null); };
  const close = () => { if (!inFlight.current) onOpenChange(false); };
  const next = () => {
    const message = validateWorkspaceDraft(draft);
    if (message) { setError(message); return; }
    setError(null); setStep((current) => Math.min(current + 1, 3));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current || creationUncertain) return;
    if (step < 3) { next(); return; }
    const validationError = validateWorkspaceDraft(draft);
    if (validationError) { setError(validationError); return; }
    inFlight.current = true; setSaving(true); setError(null);
    let latestCheckpoint = checkpoint;
    try {
      const id = await saveWorkspaceDraft(draft, services, checkpoint, (value) => {
        latestCheckpoint = value;
        setCheckpoint(value);
      }, () => {
        if (!userId || !latestCheckpoint?.id) return;
        const workspaceId = latestCheckpoint.id;
        const storage = getBrowserDraftStorage();
        if (!storage) { setStorageNotice("El espacio ya existe. No se pudo acceder al almacenamiento; este borrador no debe restaurarse en esta sesión."); return; }
        if (!removeWorkspaceDraft(storage, userId) && !markWorkspaceDraftConsumed(storage, userId, workspaceId)) setStorageNotice("El espacio ya existe. No se pudo limpiar ni marcar el borrador; no lo restaures en esta sesión.");
      });
      onCreated(id); onOpenChange(false);
    } catch {
      if (!latestCheckpoint) {
        // A failed create request may have committed without returning its ID.
        // Retrying that uncertain POST could create a second workspace.
        setCreationUncertain(true);
        setError("No se pudo confirmar la creación. Cierra este asistente y revisa la lista actualizada antes de volver a crear el espacio.");
      } else {
        setError("El espacio ya existe y algunas configuraciones siguen pendientes. Reintenta para continuar sin recrearlo.");
      }
    } finally { inFlight.current = false; setSaving(false); }
  };
  const type = workspaceTypes.find((value) => value.value === draft.workspaceType)?.label;
  const budget = /^\d+(\.\d{1,2})?$/.test(draft.budget) ? workspaceMoney(new Decimal(draft.budget), draft.baseCurrency) : "Sin definir";
  const ownerAllocation = draft.splitRule === "IncomeProportional" ? draft.ownerIncomeSharePercentage : draft.ownerCustomSharePercentage;
  const initialSplitReady = draft.splitRule === "EqualParts" ||
    ((draft.splitRule === "IncomeProportional" || draft.splitRule === "CustomPercentage") && /^\d+(\.\d{1,6})?$/.test(ownerAllocation) && new Decimal(ownerAllocation).eq(100)) ||
    (draft.splitRule === "ByResponsibility" && /^\d+(\.\d{1,6})?$/.test(draft.ownerResponsibilityWeight) && new Decimal(draft.ownerResponsibilityWeight).gt(0));
  return <ResponsiveDrawer open={open} onOpenChange={(value) => { if (!value) close(); }} size="xl" hideCloseButton={saving} title="Crear espacio compartido" description="Administra finanzas en pareja, familia o grupos, sin mezclar tu patrimonio personal." footer={<>
    {userId && !checkpoint && <Button type="button" variant="outline" disabled={saving || creationUncertain} onClick={() => { const storage = getBrowserDraftStorage(); setStorageNotice(storage && writeWorkspaceDraft(storage, userId, draft, step) ? "Borrador guardado solo en este navegador; todavía no se creó el espacio." : "No se pudo acceder al almacenamiento ni guardar el borrador local."); }}>Guardar borrador</Button>}
    {userId && !checkpoint && <Button type="button" variant="outline" disabled={saving || creationUncertain} onClick={() => { const storage = getBrowserDraftStorage(); if (!storage) { setStorageNotice("No se pudo acceder al almacenamiento local."); return; } const restored = readWorkspaceDraft(storage, userId, 1); setStorageNotice(restored.notice ?? (restored.draft ? "Borrador local cargado; el espacio aún no se ha creado." : "No hay un borrador local válido.")); if (restored.draft) { setDraft(restored.draft); setStep(restored.step); } }}>Recuperar borrador</Button>}
    {userId && !checkpoint && <Button type="button" variant="ghost" disabled={saving} onClick={() => { const storage = getBrowserDraftStorage(); setStorageNotice(storage && removeWorkspaceDraft(storage, userId) ? "Borrador local descartado." : "No se pudo acceder al almacenamiento ni descartar el borrador local."); }}>Descartar borrador</Button>}
    <Button type="button" variant="outline" disabled={saving} onClick={close}>{checkpoint ? "Cerrar · el espacio ya existe" : "Cancelar"}</Button>
    {step > 0 && <Button type="button" variant="ghost" disabled={saving || !!checkpoint || creationUncertain} onClick={() => setStep((current) => current - 1)}>Anterior</Button>}
    <Button type="submit" form="create-workspace" loading={saving} disabled={creationUncertain}>{step === 3 ? <><Plus />{checkpoint ? "Reintentar configuración" : "Crear espacio"}</> : "Continuar"}</Button>
  </>}>
    <ol aria-label="Pasos de creación" className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">{steps.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} className={`flex items-center gap-2 rounded-xl border p-2 text-xs ${index === step ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}><span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${index <= step ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{index < step ? <Check className="size-4" /> : index + 1}</span>{label}</li>)}</ol>
    <form id="create-workspace" onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="min-w-0"><fieldset disabled={saving || !!checkpoint || creationUncertain} className="min-w-0"><WorkspaceWizardStep step={step} draft={draft} onChange={change} /></fieldset>{error && <p role="alert" className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}{storageNotice && <p role="status" className="mt-2 text-xs text-muted-foreground">{storageNotice}</p>}{checkpoint && <p className="mt-2 text-xs text-muted-foreground">El espacio ya existe y algunos pasos pueden seguir pendientes. Reintentar solo completa la configuración restante.</p>}</div>
      <aside className="space-y-3" aria-live="polite">
        <section className={`${workspacePanel} space-y-3`}><h3 className="flex items-center gap-2 font-bold"><Info className="size-5 text-primary" />Resumen del espacio</h3><dl className="divide-y divide-border text-xs">{[["Tipo", type], ["Fecha de inicio", draft.startDate || "Sin definir"], ["Integrantes", `1 activo + ${draft.emails.length + (draft.inviteEmail.trim() ? 1 : 0)} invitación(es) pendiente(s)`], ["Regla deseada", splitRules.find((rule) => rule.value === draft.splitRule)?.label], ["Regla efectiva inicial", initialSplitReady ? splitRules.find((rule) => rule.value === draft.splitRule)?.label : "Partes iguales hasta que la distribución activa esté completa"], ["Presupuesto mensual · mes actual (UTC)", budget], ["Moneda", draft.baseCurrency], ["Privacidad", "Solo finanzas compartidas"]].map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>)}</dl></section>
        <section className={`${workspacePanel} space-y-3`}><h3 className="font-bold">Vista previa</h3><p className="text-xs text-muted-foreground">Así se verá tu espacio compartido.</p><div className="rounded-xl border border-border bg-muted/20 p-3"><div className="flex items-center gap-2"><WorkspaceIcon icon={draft.icon} color={draft.color} /><div className="min-w-0 flex-1"><h4 className="break-words font-bold">{draft.name || "Tu espacio compartido"}</h4><p className="text-xs text-muted-foreground">{type} · Tú</p></div><Badge variant="secondary">{draft.isActive ? "Activo" : "Inactivo"}</Badge></div><div className="mt-4 rounded-xl border border-border bg-card p-3"><span className="text-xs text-muted-foreground">Presupuesto mensual · mes actual (UTC)</span><p className="font-bold">{budget}</p></div>{draft.description && <p className="mt-2 break-words text-xs text-muted-foreground">{draft.description}</p>}</div></section>
        <section className={`${workspacePanel} space-y-3`}><h3 className="flex items-center gap-2 font-bold"><Lightbulb className="size-5 text-primary" />Sugerencias</h3>{["Define una regla clara de aportes", "Separa gastos personales de los compartidos", "Programa un cierre mensual"].map((tip) => <p key={tip} className="flex gap-2 text-xs"><Check className="size-4 shrink-0 text-emerald-500" />{tip}</p>)}</section>
      </aside>
    </form>
  </ResponsiveDrawer>;
}
