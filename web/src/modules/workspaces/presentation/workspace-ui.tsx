import React from "react";
import Decimal from "decimal.js";
import { formatAmountText } from "@/shared/lib/amount-format";
import { getNumberFormatPreferences } from "@/shared/lib/number-format";
import { Home, Heart, Users, Plane, Mountain, Briefcase, Star } from "lucide-react";

export const workspaceIcons = { home: Home, heart: Heart, users: Users, plane: Plane, mountain: Mountain, briefcase: Briefcase, star: Star };
export const workspaceColors = {
  violet: "bg-primary/15 text-primary border-primary/30",
  emerald: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-500 border-amber-500/30",
};
export const workspacePanel = "rounded-2xl border border-border bg-card p-4 shadow-sm";
export function WorkspaceIcon({ icon, color }: { icon?: string | null; color?: string | null }) {
  const Icon = workspaceIcons[icon as keyof typeof workspaceIcons] ?? Home;
  return <span className={`inline-flex size-12 shrink-0 items-center justify-center rounded-xl border ${workspaceColors[color as keyof typeof workspaceColors] ?? workspaceColors.violet}`}><Icon className="size-6" aria-hidden="true" /></span>;
}
export function workspaceMoney(amount: Decimal.Value, currency: string) {
  return formatAmountText(new Decimal(amount), currency, getNumberFormatPreferences(), { currencyDisplay: "symbol" });
}
