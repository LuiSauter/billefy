import { describe, expect, it } from "vitest"
import { isPositiveDecimal, sanitizeDecimalInput } from "./money-input"

describe("sanitizeDecimalInput", () => {
  it("keeps plain digits", () => {
    expect(sanitizeDecimalInput("123")).toBe("123")
  })
  it("converts comma to dot", () => {
    expect(sanitizeDecimalInput("12,5")).toBe("12.5")
  })
  it("keeps only the first separator", () => {
    expect(sanitizeDecimalInput("1.2.3")).toBe("1.23")
    expect(sanitizeDecimalInput("1,2,3")).toBe("1.23")
  })
  it("strips non numeric characters", () => {
    expect(sanitizeDecimalInput("Bs 1a2-3")).toBe("123")
  })
  it("strips leading zeros but keeps 0.", () => {
    expect(sanitizeDecimalInput("007")).toBe("7")
    expect(sanitizeDecimalInput("0")).toBe("0")
    expect(sanitizeDecimalInput("000")).toBe("0")
    expect(sanitizeDecimalInput("0.")).toBe("0.")
    expect(sanitizeDecimalInput("0.5")).toBe("0.5")
    expect(sanitizeDecimalInput("00.5")).toBe("0.5")
  })
  it("prefixes 0 when starting with a separator", () => {
    expect(sanitizeDecimalInput(".5")).toBe("0.5")
    expect(sanitizeDecimalInput(",")).toBe("0.")
  })
  it("limits decimals", () => {
    expect(sanitizeDecimalInput("1.2345")).toBe("1.23")
    expect(sanitizeDecimalInput("1.2345", 4)).toBe("1.2345")
    expect(sanitizeDecimalInput("1.239", 0)).toBe("1")
  })
  it("returns empty string for empty input", () => {
    expect(sanitizeDecimalInput("")).toBe("")
    expect(sanitizeDecimalInput("abc")).toBe("")
  })
  it("preserves very long values without floating point", () => {
    expect(sanitizeDecimalInput("12345678901234567890.12")).toBe("12345678901234567890.12")
  })
})

describe("isPositiveDecimal", () => {
  it("accepts positive decimals", () => {
    expect(isPositiveDecimal("1")).toBe(true)
    expect(isPositiveDecimal("0.01")).toBe(true)
    expect(isPositiveDecimal("12.50")).toBe(true)
  })
  it("rejects zero, empty and malformed values", () => {
    expect(isPositiveDecimal("")).toBe(false)
    expect(isPositiveDecimal("0")).toBe(false)
    expect(isPositiveDecimal("0.00")).toBe(false)
    expect(isPositiveDecimal("0.")).toBe(false)
    expect(isPositiveDecimal(".")).toBe(false)
    expect(isPositiveDecimal("-1")).toBe(false)
    expect(isPositiveDecimal("1.2.3")).toBe(false)
    expect(isPositiveDecimal("abc")).toBe(false)
  })
})
