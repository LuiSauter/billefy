"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/modules/identity/application/AuthContext";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import type { IWorkspacesRepository, WorkspaceInvitationLinkPreviewDto } from "../domain/workspaces.types";
import { createWorkspaceInvitationLinksResource } from "../application/workspace-invitation-links-resource";
import { captureWorkspaceInvitationToken, WORKSPACE_INVITATION_TOKEN_ERROR } from "./workspace-join";

const AuthScreen = dynamic(() => import("@/modules/identity/presentation/AuthScreen").then((module) => module.AuthScreen));
const GENERIC_LINK_ERROR = "El enlace de invitación es inválido, ya fue utilizado o ha expirado.";

function goHome() { window.location.assign("/"); }
function goToWorkspace(workspaceId: string) { window.location.assign(`/?workspace=${encodeURIComponent(workspaceId)}`); }
function formatExpiration(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(date);
}

interface JoinContentProps {
  preview: WorkspaceInvitationLinkPreviewDto | null;
  loading: boolean;
  accepting: boolean;
  error: string | null;
  onAccept: () => void;
  onGoHome: () => void;
  onGoToWorkspace: () => void;
}

export function WorkspaceJoinContent({ preview, loading, accepting, error, onAccept, onGoHome, onGoToWorkspace }: JoinContentProps) {
  return <main className="min-h-screen bg-background px-4 py-12 flex items-center justify-center">
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Invitación a un espacio compartido</CardTitle>
        <CardDescription>Únete a un espacio para organizar tus finanzas en conjunto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && <p role="status" className="text-sm text-muted-foreground">Verificando invitación...</p>}
        {error && <div role="alert" className="space-y-4"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={onGoHome}>Ir al inicio</Button></div>}
        {preview && <>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{preview.workspaceName}</h2>
            <p className="text-sm text-muted-foreground">Rol: Miembro</p>
            <p className="text-sm text-muted-foreground">Invitación válida hasta el {formatExpiration(preview.expiresAt)}.</p>
          </div>
          {preview.alreadyMember ? <div className="space-y-4">
            <p className="text-sm">Ya formas parte de este espacio compartido.</p>
            <Button onClick={onGoToWorkspace}>Ir al espacio</Button>
          </div> : <Button onClick={onAccept} loading={accepting}>Aceptar invitación</Button>}
        </>}
      </CardContent>
    </Card>
  </main>;
}

export function JoinWorkspaceView({ repository }: { repository: IWorkspacesRepository }) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const tokenLatch = useRef(false);
  const capturedToken = useRef<string | null>(null);
  const [capture, setCapture] = useState<{ token: string | null; error: string | null } | null>(null);
  const resource = useMemo(() => createWorkspaceInvitationLinksResource(repository), [repository]);
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  const attempted = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (tokenLatch.current) return;
    tokenLatch.current = true;
    const result = captureWorkspaceInvitationToken(window);
    capturedToken.current = result.token;
    setCapture(result);
  }, []);

  useEffect(() => {
    const token = capturedToken.current;
    const userId = isAuthenticated ? user?.id ?? null : null;
    resource.setSource(token, userId);
    if (!authLoading && isAuthenticated && token && userId && attempted.current !== `${userId}:${token}`) {
      attempted.current = `${userId}:${token}`;
      void resource.preview(token, userId);
    }
    if (!isAuthenticated) attempted.current = null;
  }, [authLoading, isAuthenticated, user?.id, resource, capture]);

  const accept = useCallback(async () => {
    const token = capturedToken.current;
    const userId = user?.id;
    if (!token || !isAuthenticated || !userId) return;
    const result = await resource.accept(token, userId);
    if (result) goToWorkspace(result.workspaceId);
  }, [isAuthenticated, resource, user?.id]);

  const openWorkspace = useCallback(async () => {
    const workspaceId = state.preview?.workspaceId;
    if (!workspaceId) return;
    try {
      const available = await repository.getWorkspaces();
      if (available.some((workspace) => workspace.id === workspaceId)) goToWorkspace(workspaceId);
      else goHome();
    } catch {
      goHome();
    }
  }, [repository, state.preview?.workspaceId]);

  if (!capture) return <main className="min-h-screen bg-background flex items-center justify-center"><p role="status">Preparando invitación...</p></main>;
  if (capture.error || !capture.token) return <WorkspaceJoinContent preview={null} loading={false} accepting={false} error={capture.error || WORKSPACE_INVITATION_TOKEN_ERROR} onAccept={() => undefined} onGoHome={goHome} onGoToWorkspace={goHome} />;
  if (authLoading) return <main className="min-h-screen bg-background flex items-center justify-center"><p role="status">Verificando sesión segura...</p></main>;
  if (!isAuthenticated) return <AuthScreen p2pRate={9.85} />;
  return <WorkspaceJoinContent preview={state.preview} loading={state.loading} accepting={state.accepting} error={state.error ? GENERIC_LINK_ERROR : null} onAccept={() => void accept()} onGoHome={goHome} onGoToWorkspace={() => void openWorkspace()} />;
}
