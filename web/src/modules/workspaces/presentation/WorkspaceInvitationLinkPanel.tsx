"use client";

import React, { useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { buildWorkspaceInvitationLinkUrl } from "./workspace-invitation-link";

interface Props {
  issueInvitationLink: () => Promise<{ token: string; expiresAt: string }>;
}

function formatExpiration(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(date) : "";
}

/** Anyone holding the link can join as Member; it carries no planned split and cannot grant a role. */
export function WorkspaceInvitationLinkPanel({ issueInvitationLink }: Props) {
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  const issue = async () => {
    setLoading(true); setError(null); setCopyStatus("");
    try {
      const issued = await issueInvitationLink();
      setLink({ url: buildWorkspaceInvitationLinkUrl(window.location.origin, issued.token), expiresAt: issued.expiresAt });
    } catch { setError("No se pudo generar el enlace. Inténtalo de nuevo."); }
    finally { setLoading(false); }
  };
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.url); setCopyStatus("Enlace copiado."); }
    catch { setCopyStatus("No se pudo copiar. Selecciona el texto y cópialo manualmente."); }
  };

  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Genera un enlace para compartir por el medio que prefieras (WhatsApp, correo, etc.). Cualquier persona con el enlace puede unirse como Integrante. Billefy no envía el mensaje por ti.</p>
    {!link && <Button type="button" loading={loading} onClick={() => void issue()}><Link2 />Generar enlace de invitación</Button>}
    {link && <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      <p className="break-all text-sm" aria-label="Enlace de invitación">{link.url}</p>
      <p className="text-xs text-muted-foreground">Válido hasta el {formatExpiration(link.expiresAt)}. Se puede usar una sola vez.</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => void copy()}><Copy />Copiar enlace</Button>
        <Button type="button" variant="outline" size="sm" loading={loading} onClick={() => void issue()}>Generar otro enlace</Button>
      </div>
      {copyStatus && <p role="status" className="text-xs text-muted-foreground">{copyStatus}</p>}
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
