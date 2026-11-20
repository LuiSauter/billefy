/** The token travels only in the URL fragment, so it never reaches server logs. */
export function buildWorkspaceInvitationLinkUrl(origin: string, token: string): string {
  return `${origin}/join-workspace#token=${encodeURIComponent(token)}`;
}
