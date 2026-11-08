import React from "react";
import { Check, Mail } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { WorkspaceInvitationDto } from "../domain/workspaces.types";
import { workspacePanel } from "./workspace-ui";

interface Props {
  invitations: WorkspaceInvitationDto[];
  busy: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export function WorkspaceInvitationsPanel({ invitations, busy, onAccept, onReject }: Props) {
  const pending = invitations.filter((invitation) => invitation.status === "Pending");
  return (
    <section className={workspacePanel}>
      <h2 className="mb-3 flex items-center gap-2 font-bold">
        <Mail className="size-5 text-primary" />
        Invitaciones pendientes
        <Badge variant="secondary" className="ml-auto">{pending.length}</Badge>
      </h2>
      <div className="divide-y divide-border">
        {pending.map((invitation) => (
          <article key={invitation.id} className="space-y-2 py-3">
            <p className="text-sm font-semibold">{invitation.workspaceName}</p>
            <p className="text-xs text-muted-foreground">Te invitaron a este espacio compartido.</p>
            <div className="flex gap-2">
              <Button size="sm" loading={busy} onClick={() => onAccept(invitation.id)}>
                <Check />Aceptar
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onReject(invitation.id)}>
                Rechazar
              </Button>
            </div>
          </article>
        ))}
        {pending.length === 0 && (
          <p className="py-3 text-xs text-muted-foreground">No tienes invitaciones pendientes.</p>
        )}
      </div>
    </section>
  );
}
