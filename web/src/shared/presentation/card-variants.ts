/**
 * Shared card recipe for "dashboard-style" modules (Dashboard home, Accounts).
 * Single source of truth: modules wrap `Card` with these constants instead of
 * re-typing the surface string (which previously drifted in border/shadow tokens).
 */

/** Card surface variant. */
export const appCardClassName =
  "rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs";

/** Standard spacing: p-4 for the main grid cards. */
export const appCardHeaderClassName = "p-4 pb-2";
export const appCardContentClassName = "p-4 pt-2";

/** Type scale: card titles are text-base font-extrabold (CardTitle itself adds tracking-tight). */
export const appCardTitleClassName = "text-base font-extrabold text-foreground";
