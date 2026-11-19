import { appCardTitleClassName } from "@/shared/presentation/card-variants";

/**
 * Accounts module type scale + interaction conventions.
 * - Page h1 (list header, detail header): text-xl/2xl font-extrabold tracking-tight.
 * - Card / section titles: text-base font-extrabold tracking-tight (same recipe as the Dashboard).
 * - Active state (tabs, filter pills, view-mode toggle): `Button variant="default"` (bg-primary),
 *   inactive: `variant="outline"` (or "ghost" inside a segmented group).
 */
export const accountsPageTitleClassName =
  "text-xl sm:text-2xl font-extrabold text-foreground tracking-tight";

export const accountsSectionTitleClassName = `${appCardTitleClassName} tracking-tight`;

/** Shared size recipe for tab / filter pills (variant decides the active look). */
export const accountsPillClassName =
  "h-9 md:h-9 px-3.5 rounded-xl text-xs font-bold gap-2 shrink-0 cursor-pointer";

/** One active-state convention for every toggle-like control in the module. */
export function accountsToggleVariant(active: boolean): "default" | "outline" {
  return active ? "default" : "outline";
}

/**
 * Compact (h-8, text-xs) overrides for filter controls inside card headers.
 * SelectField / Input default to a 44-48px form size; these override their size variants.
 */
export const accountsCompactSelectClassName =
  "rounded-xl bg-muted/60 hover:bg-muted pl-3 pr-7 py-1.5 data-[size=lg]:h-8 md:data-[size=lg]:h-8 data-[size=lg]:text-xs md:data-[size=lg]:text-xs data-[size=lg]:font-semibold";

export const accountsCompactInputClassName =
  "h-8 md:h-8 rounded-xl bg-muted/60 hover:bg-muted focus:bg-background pl-8 pr-3 py-1.5 text-xs md:text-xs";
