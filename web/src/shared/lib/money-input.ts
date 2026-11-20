/**
 * Pure string helpers for money inputs.
 * Money is NEVER parsed with floating point here: values stay as strings.
 */

/**
 * Sanitizes raw user input into a canonical decimal string:
 * digits plus at most one "." separator (a comma is converted to a dot),
 * no superfluous leading zeros ("007" -> "7", "0." is kept) and at most
 * `maxDecimals` fractional digits.
 */
export function sanitizeDecimalInput(raw: string, maxDecimals = 2): string {
  const decimals = Math.max(0, Math.floor(maxDecimals))
  const cleaned = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "")
  if (cleaned === "") return ""

  const firstDot = cleaned.indexOf(".")
  let integerPart: string
  let fractionPart: string
  const hasSeparator = firstDot !== -1 && decimals > 0

  if (firstDot === -1) {
    integerPart = cleaned
    fractionPart = ""
  } else {
    integerPart = cleaned.slice(0, firstDot)
    fractionPart = cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, decimals)
  }

  integerPart = integerPart.replace(/^0+(?=\d)/, "")
  if (integerPart === "" && (hasSeparator || firstDot !== -1)) integerPart = "0"

  return hasSeparator ? `${integerPart}.${fractionPart}` : integerPart
}

/** True when `value` is a well-formed decimal string strictly greater than zero. */
export function isPositiveDecimal(value: string): boolean {
  if (!/^\d+(\.\d+)?$/.test(value)) return false
  return /[1-9]/.test(value)
}
