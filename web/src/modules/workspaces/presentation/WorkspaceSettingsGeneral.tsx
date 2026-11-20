"use client";

import React, { useRef, useState } from "react";
import { Bell, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { SelectField } from "@/shared/ui/select-field";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import type { IWorkspacesRepository, WorkspaceDetailDto } from "../domain/workspaces.types";
import { buildWorkspaceInfoRequest } from "./workspace-settings";
import { WorkspaceIcon, workspaceColors, workspaceIcons, workspacePanel } from "./workspace-ui";

interface Props { workspace: WorkspaceDetailDto; repository: IWorkspacesRepository | null; canManage: boolean; isOwner: boolean; onUpdated: (workspace: WorkspaceDetailDto) => void; onDeactivate: () => void; }
export function WorkspaceSettingsGeneral({ workspace, repository, canManage, isOwner, onUpdated, onDeactivate }: Props) {
  const initialInfo = { name: workspace.name, description: workspace.description ?? "", color: workspace.color, icon: workspace.icon };
  const [info, setInfo] = useState(initialInfo);
  const [settings, setSettings] = useState(workspace.settings);
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const disabled = !canManage || !repository || saving || uncertain;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled || inFlight.current || !repository) return;
    let request;
    try { request = buildWorkspaceInfoRequest(info); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Revisa la información."); return; }
    inFlight.current = true;
    setSaving(true);
    setMessage(null);
    try {
      await repository.updateWorkspace(workspace.id, request);
      // This endpoint replaces settings: preserve every privacy preference not edited here.
      await repository.updateSettings(workspace.id, settings);
      const updated = await repository.getWorkspace(workspace.id);
      onUpdated(updated);
      setMessage("Cambios guardados.");
    } catch { setUncertain(true); setMessage("No se pudo confirmar el guardado completo. Actualiza la información antes de volver a guardar."); }
    finally { inFlight.current = false; setSaving(false); }
  };
  const reload = async () => {
    if (!repository || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const updated = await repository.getWorkspace(workspace.id);
      setInfo({ name: updated.name, description: updated.description ?? "", color: updated.color, icon: updated.icon });
      setSettings(updated.settings);
      onUpdated(updated);
      setUncertain(false);
      setMessage("Información actualizada. Revisa los cambios antes de guardar.");
    } catch { setMessage("No se pudo actualizar la información. Inténtalo nuevamente."); }
    finally { inFlight.current = false; setSaving(false); }
  };
  const iconLabels: Record<keyof typeof workspaceIcons, string> = { home: "Hogar", heart: "Corazón", users: "Integrantes", plane: "Viaje", mountain: "Montaña", briefcase: "Trabajo", star: "Estrella" };
  const colorLabels: Record<keyof typeof workspaceColors, string> = { violet: "Violeta", emerald: "Verde", amber: "Ámbar" };
  return <form onSubmit={save} className="space-y-4"><div className="grid items-start gap-4 lg:grid-cols-2">
    <div className="space-y-4"><section className={workspacePanel}><h2 className="text-lg font-bold">Información del espacio</h2><p className="mb-5 text-xs text-muted-foreground">Datos principales de tu espacio compartido.</p><fieldset disabled={disabled} className="space-y-4"><FormField label="Nombre del espacio" required>{(control) => <Input {...control} required maxLength={120} value={info.name} onChange={(event) => setInfo((current) => ({ ...current, name: event.target.value }))} />}</FormField><FormField label="Descripción (opcional)">{(control) => <Textarea {...control} maxLength={200} value={info.description} onChange={(event) => setInfo((current) => ({ ...current, description: event.target.value }))} />}</FormField><p className="text-right text-xs text-muted-foreground">{info.description.length} / 200</p></fieldset></section>
      <section className={workspacePanel}><h2 className="text-lg font-bold">Marca del espacio</h2><p className="mb-4 text-xs text-muted-foreground">Personaliza la apariencia de tu espacio.</p><fieldset disabled={disabled} className="space-y-4"><div className="flex items-center gap-4"><WorkspaceIcon icon={info.icon} color={info.color} /><div><p className="mb-2 text-sm">Color principal</p><div className="flex gap-2">{Object.entries(workspaceColors).map(([color, classes]) => <Button key={color} type="button" size="icon" variant="outline" aria-label={colorLabels[color as keyof typeof workspaceColors]} aria-pressed={info.color === color} className={`${classes} rounded-full ${info.color === color ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`} onClick={() => setInfo((current) => ({ ...current, color }))}><span aria-hidden="true" className="size-4 rounded-full bg-current" /></Button>)}</div></div></div><FormField label="Icono del espacio">{(control) => <SelectField {...control} value={info.icon ?? ""} placeholder="Selecciona un icono" options={Object.keys(workspaceIcons).map((icon) => ({ value: icon, label: iconLabels[icon as keyof typeof workspaceIcons] }))} onChange={(event) => setInfo((current) => ({ ...current, icon: event.target.value }))} />}</FormField><Button variant="outline" type="button" onClick={() => setInfo((current) => ({ ...current, color: "violet", icon: "home" }))}>Restablecer marca</Button></fieldset></section>
    </div>
    <div className="space-y-4"><section className={workspacePanel}><h2 className="flex items-center gap-2 text-lg font-bold"><Bell className="size-5 text-chart-4" />Preferencias</h2><p className="mb-3 text-xs text-muted-foreground">Configura el comportamiento del espacio.</p>{([{ key: "paymentReminders", label: "Recordatorios de pagos", description: "Alertas de gastos, aportaciones y metas." }, { key: "weeklySummary", label: "Resumen semanal", description: "Preferencia para el resumen semanal." }, { key: "spaceNotifications", label: "Notificaciones del espacio", description: "Notificaciones de actividad del espacio." }] as const).map(({ key, label, description }) => <div key={key} className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"><div><label htmlFor={`workspace-${key}`} className="text-sm font-semibold">{label}</label><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Switch id={`workspace-${key}`} checked={settings[key]} disabled={disabled} onCheckedChange={(checked) => setSettings((current) => ({ ...current, [key]: checked }))} /></div>)}</section>
      <section className={workspacePanel}><h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><ShieldCheck className="size-5 text-chart-4" />Seguridad</h2><div className="flex items-center justify-between gap-4 border-b border-border py-3"><div><label htmlFor="workspace-2fa" className="text-sm font-semibold">Autenticación en dos pasos (2FA)</label><p className="mt-1 text-xs text-muted-foreground">Próximamente · No disponible en esta versión</p></div><Switch id="workspace-2fa" checked={false} disabled /></div><div className="flex items-center justify-between gap-3 py-3"><div><h3 className="text-sm font-semibold">Sesiones activas</h3><p className="mt-1 text-xs text-muted-foreground">No disponible en esta versión</p></div><Button variant="outline" type="button" disabled>Ver sesiones</Button></div></section>
      <section className={`${workspacePanel} border-destructive/40 bg-destructive/5`}><h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-destructive"><Trash2 className="size-5" />Zona de peligro</h2><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="font-semibold">Eliminar espacio</h3><p className="mt-1 max-w-sm text-xs text-muted-foreground">En esta versión se desactiva el espacio. No se eliminan permanentemente sus datos.</p></div><Button variant="destructive" type="button" disabled={!isOwner || !repository || saving} onClick={onDeactivate}>Desactivar espacio</Button></div>{!isOwner && <p className="mt-3 text-xs text-muted-foreground">Solo el propietario puede desactivar el espacio.</p>}</section>
    </div>
  </div>
  {!canManage && <p className="text-xs text-muted-foreground">Solo propietarios y administradores activos pueden guardar cambios.</p>}
  {message && <p role={uncertain ? "alert" : "status"} className={`text-sm ${uncertain ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>}
  <div className="flex flex-wrap gap-3"><Button variant="outline" type="button" disabled={saving} onClick={() => { setInfo(initialInfo); setSettings(workspace.settings); setMessage(null); }}>Cancelar</Button>{uncertain ? <Button type="button" disabled={saving} onClick={() => void reload()}>Actualizar información</Button> : <Button type="submit" disabled={disabled} loading={saving}><Sparkles />Guardar cambios</Button>}</div>
  </form>;
}
