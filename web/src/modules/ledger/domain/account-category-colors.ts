import type { AccountCategoryGroup } from "./accounts-overview";

/** Tone keys; they intentionally match the shared `IconTile` variant names. */
export type AccountCategoryTone = "blue" | "purple" | "amber" | "emerald" | "muted";

export interface AccountCategoryColor {
  /** Tile / badge tone used by the stat cards. */
  tone: AccountCategoryTone;
  /** Theme chart token used by the donut slices and legend dots. */
  chartColor: string;
}

/**
 * Single source of truth for account-category colors. The stat cards
 * (AccountsHeaderStats) and the distribution donut (AccountsAnalyticsSidePanels)
 * appear on the same page and must always agree.
 */
export const ACCOUNT_CATEGORY_COLORS: Record<AccountCategoryGroup, AccountCategoryColor> = {
  bancos: { tone: "blue", chartColor: "var(--color-chart-1)" },
  wallets: { tone: "purple", chartColor: "var(--color-chart-4)" },
  cripto: { tone: "amber", chartColor: "var(--color-chart-3)" },
  efectivo: { tone: "emerald", chartColor: "var(--color-chart-2)" },
  otros: { tone: "muted", chartColor: "var(--muted-foreground)" },
};
