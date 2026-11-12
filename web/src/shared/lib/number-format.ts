import Decimal from "decimal.js";
import { defaultTokenStorage } from "@/shared/infrastructure/local-storage-token.adapter";

export type NumberGroupingConvention = "es-BO" | "en-US";
export interface NumberFormatPreferences { convention: NumberGroupingConvention; decimalPlaces: number }
export const DEFAULT_NUMBER_FORMAT_PREFERENCES: NumberFormatPreferences = { convention: "es-BO", decimalPlaces: 2 };
let currentPreferences = DEFAULT_NUMBER_FORMAT_PREFERENCES;
let hydrated = false;
const subscribers = new Set<() => void>();

function normalizePreferences(convention?: NumberGroupingConvention, decimalPlaces?: number): NumberFormatPreferences {
  return { convention: convention === "en-US" ? "en-US" : "es-BO", decimalPlaces: Number.isInteger(decimalPlaces) ? Math.min(8, Math.max(0, decimalPlaces!)) : 2 };
}
function hydrateOnce(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const user = defaultTokenStorage.getUser() as { numberGroupingConvention?: NumberGroupingConvention; maximumDecimalPlaces?: number } | null;
  if (user?.numberGroupingConvention || user?.maximumDecimalPlaces !== undefined) {
    currentPreferences = normalizePreferences(user.numberGroupingConvention, user.maximumDecimalPlaces);
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("billefy:number-format-updated", (event: Event) => {
    const detail = (event as CustomEvent<{ numberGroupingConvention?: NumberGroupingConvention; maximumDecimalPlaces?: number }>).detail;
    setNumberFormatPreferences(detail?.numberGroupingConvention ?? currentPreferences.convention, detail?.maximumDecimalPlaces ?? currentPreferences.decimalPlaces);
  });
}
export function getNumberFormatPreferences(): NumberFormatPreferences { hydrateOnce(); return currentPreferences; }
export function setNumberFormatPreferences(convention: NumberGroupingConvention, decimals: number): void {
  hydrated = true;
  const next = normalizePreferences(convention, decimals);
  if (next.convention === currentPreferences.convention && next.decimalPlaces === currentPreferences.decimalPlaces) return;
  currentPreferences = next;
  subscribers.forEach((callback) => callback());
}
export function subscribeNumberFormatPreferences(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}
export function formatUserNumber(value: string | number | Decimal): string {
  const preferences = getNumberFormatPreferences();
  return formatNumber(value, preferences.convention, preferences.decimalPlaces);
}
export function formatNumber(value: string | number | Decimal, convention: NumberGroupingConvention = "es-BO", decimalPlaces = 2): string {
  const places = Number.isInteger(decimalPlaces) ? Math.min(8, Math.max(0, decimalPlaces)) : 2;
  const decimal = new Decimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
  const fixed = decimal.abs().toFixed(places);
  const [integer, fraction] = fixed.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, convention === "es-BO" ? "." : ",");
  const separator = convention === "es-BO" ? "," : ".";
  return `${decimal.isNegative() ? "-" : ""}${grouped}${places ? `${separator}${fraction}` : ""}`;
}
