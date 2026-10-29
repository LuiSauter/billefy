import { describe, expect, it } from "vitest"
import {
  applyKeypadKey,
  currencyChipLabel,
  normalizeAmountString,
} from "./keypad"

function press(keys: string[], start = ""): string {
  return keys.reduce((value, key) => applyKeypadKey(value, key), start)
}

describe("applyKeypadKey", () => {
  it("appends digits", () => {
    expect(press(["1", "2", "3"])).toBe("123")
  })

  it("replaces a lone zero instead of building leading zeros", () => {
    expect(press(["5"], "0")).toBe("5")
    expect(press(["0", "0", "7"])).toBe("7")
  })

  it("starts a decimal with a leading zero", () => {
    expect(press(["."])).toBe("0.")
    expect(press(["."], "0")).toBe("0.")
    expect(press([".", "5"])).toBe("0.5")
  })

  it("accepts only one decimal separator", () => {
    expect(press(["1", ".", "2", ".", "3"])).toBe("1.23")
  })

  it("limits the fraction to two decimals", () => {
    expect(press(["1", ".", "2", "5", "9"])).toBe("1.25")
  })

  it("honors a custom decimal limit", () => {
    expect(applyKeypadKey("1.2", "3", { maxDecimals: 2 })).toBe("1.23")
    expect(applyKeypadKey("1.2", "3", { maxDecimals: 1 })).toBe("1.2")
    expect(applyKeypadKey("1", ".", { maxDecimals: 0 })).toBe("1")
  })

  it("limits the integer part", () => {
    expect(applyKeypadKey("123", "4", { maxIntegerDigits: 3 })).toBe("123")
    expect(applyKeypadKey("123.4", "5", { maxIntegerDigits: 3 })).toBe("123.45")
  })

  it("removes the last character on backspace", () => {
    expect(applyKeypadKey("123", "backspace")).toBe("12")
    expect(applyKeypadKey("1.25", "backspace")).toBe("1.2")
    expect(applyKeypadKey("0.", "backspace")).toBe("0")
  })

  it("returns to empty when everything is deleted", () => {
    expect(applyKeypadKey("5", "backspace")).toBe("")
    expect(applyKeypadKey("0", "backspace")).toBe("")
    expect(applyKeypadKey("", "backspace")).toBe("")
  })

  it("ignores unknown keys", () => {
    expect(applyKeypadKey("12", "x")).toBe("12")
    expect(applyKeypadKey("12", "-")).toBe("12")
  })
})

describe("normalizeAmountString", () => {
  it("drops a dangling decimal separator", () => {
    expect(normalizeAmountString("5.")).toBe("5")
    expect(normalizeAmountString("0.")).toBe("0")
  })

  it("keeps complete decimals untouched", () => {
    expect(normalizeAmountString("5.50")).toBe("5.50")
    expect(normalizeAmountString("12")).toBe("12")
    expect(normalizeAmountString("")).toBe("")
  })
})

describe("currencyChipLabel", () => {
  it("maps known currencies to their short label", () => {
    expect(currencyChipLabel("BOB")).toBe("Bs")
    expect(currencyChipLabel("USD")).toBe("$")
    expect(currencyChipLabel("USDT")).toBe("USDT")
  })

  it("falls back to the code, and to Bs without an account", () => {
    expect(currencyChipLabel("EUR")).toBe("EUR")
    expect(currencyChipLabel(undefined)).toBe("Bs")
  })
})
