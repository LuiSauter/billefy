import React from "react";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import type { WorkspaceMemberDto } from "../domain/workspaces.types";

// The workspace contract exposes no member names or photos. Never invent identities.
export function workspaceMemberLabel(members: WorkspaceMemberDto[], id: string, viewerUserId?: string) {
  const index = members.findIndex((member) => member.id === id);
  if (index < 0) return "Integrante anterior";
  return members[index].userId === viewerUserId ? "Tú" : `Integrante ${index + 1}`;
}
export function WorkspaceMember({ members, id, viewerUserId }: { members: WorkspaceMemberDto[]; id: string; viewerUserId?: string }) {
  const label = workspaceMemberLabel(members, id, viewerUserId);
  return <span className="inline-flex items-center gap-2"><Avatar className="size-9"><AvatarFallback className="bg-primary/15 text-primary">{label === "Tú" ? "T" : members.findIndex((member) => member.id === id) + 1 || "?"}</AvatarFallback></Avatar><span className="text-sm font-semibold">{label}</span></span>;
}
