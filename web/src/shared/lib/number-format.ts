import Decimal from "decimal.js";

export type NumberGroupingConvention = "es-BO" | "en-US";

let currentPreferences = { convention: "es-BO" as NumberGroupingConvention, decimalPlaces: 2 };

export function setNumberFormatPreferences(convention: NumberGroupingConvention, decimalPlaces: number): void {
  currentPreferences = { convention, decimalPlaces };
}

export function formatUserNumber(value: string | number | Decimal): string {
  if (typeof window !== "undefined") {
    try {
      const user = JSON.parse(window.localStorage.getItem("billefy_user") ?? "{}") as {
        numberGroupingConvention?: NumberGroupingConvention;
        maximumDecimalPlaces?: number;
      };
      if (user.numberGroupingConvention && user.maximumDecimalPlaces !== undefined) {
        return formatNumber(value, user.numberGroupingConvention, user.maximumDecimalPlaces);
      }
    } catch {
      // Use the backend-aligned defaults until a valid authenticated user is stored.
    }
  }
  return formatNumber(value, currentPreferences.convention, currentPreferences.decimalPlaces);
}

export function formatNumber(
  value: string | number | Decimal,
  convention: NumberGroupingConvention = "es-BO",
  decimalPlaces = 2
): string {
  const places = Number.isInteger(decimalPlaces) ? Math.min(6, Math.max(0, decimalPlaces)) : 2;
  const decimal = new Decimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
  const fixed = decimal.abs().toFixed(places);
  const [integer, fraction] = fixed.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, convention === "es-BO" ? "." : ",");
  const decimalSeparator = convention === "es-BO" ? "," : ".";
  return `${decimal.isNegative() ? "-" : ""}${grouped}${places ? `${decimalSeparator}${fraction}` : ""}`;
}
