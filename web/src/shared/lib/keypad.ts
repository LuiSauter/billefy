/**
 * Pure helpers shared by the transaction modals.
 * Amounts are always decimal STRINGS here: money is never parsed with floats.
 */

export const KEYPAD_KEYS = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  ".", "0", "backspace",
] as const

export type KeypadKey = (typeof KEYPAD_KEYS)[number]

type KeypadOptions = {
  /** Maximum fractional digits (default 2). */
  maxDecimals?: number
  /** Maximum digits before the separator (default 9). */
  maxIntegerDigits?: number
}

/**
 * Reducer for the on-screen numeric keypad.
 * `current` may be "" (nothing typed yet) or "0"; both behave the same.
 * Returns "" when everything has been deleted.
 */
export function applyKeypadKey(
  current: string,
  key: string,
  { maxDecimals = 2, maxIntegerDigits = 9 }: KeypadOptions = {}
): string {
  if (key === "backspace") {
    return current === "0" ? "" : current.slice(0, -1)
  }

  if (key === ".") {
    if (maxDecimals <= 0 || current.includes(".")) return current
    return current === "" || current === "0" ? "0." : `${current}.`
  }

  if (!/^[0-9]$/.test(key)) return current

  const dotIndex = current.indexOf(".")
  if (dotIndex === -1) {
    if (current.length >= maxIntegerDigits) return current
  } else if (current.length - dotIndex - 1 >= maxDecimals) {
    return current
  }

  return current === "" || current === "0" ? key : current + key
}

/** Drops a dangling decimal separator: "5." -> "5". */
export function normalizeAmountString(value: string): string {
  return value.replace(/\.$/, "")
}

/** Short label for the currency chip of an amount field. */
export function currencyChipLabel(currency: string | undefined): string {
  if (!currency || currency === "BOB") return "Bs"
  if (currency === "USD") return "$"
  return currency
}
