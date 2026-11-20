export const WORKSPACE_INVITATION_TOKEN_ERROR = "El enlace de invitación es inválido o está incompleto.";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface WorkspaceInvitationTokenCapture {
  token: string | null;
  error: string | null;
}

/** Reads a capability token from the fragment and removes the fragment before exposing it. */
export function captureWorkspaceInvitationToken(win: Window): WorkspaceInvitationTokenCapture {
  const fragment = win.location.hash.startsWith("#") ? win.location.hash.slice(1) : win.location.hash;
  let candidate: string | null = null;
  if (fragment.startsWith("token=")) {
    const params = new URLSearchParams(fragment);
    candidate = params.get("token");
  } else if (!fragment.includes("=")) {
    candidate = fragment;
  }

  try {
    win.history.replaceState(win.history.state, "", `${win.location.pathname}${win.location.search}`);
  } catch {
    return { token: null, error: WORKSPACE_INVITATION_TOKEN_ERROR };
  }

  if (!candidate || !TOKEN_PATTERN.test(candidate)) {
    return { token: null, error: WORKSPACE_INVITATION_TOKEN_ERROR };
  }
  return { token: candidate, error: null };
}
