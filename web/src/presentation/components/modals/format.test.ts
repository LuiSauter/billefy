import { describe, expect, it } from "vitest"
import { formatFileSize, formatSignedAmount } from "./format"

describe("formatFileSize", () => {
  it("renders bytes below 1 KB", () => {
    expect(formatFileSize(0)).toBe("0 B")
    expect(formatFileSize(512)).toBe("512 B")
  })

  it("renders kilobytes with one decimal", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB")
    expect(formatFileSize(1536)).toBe("1.5 KB")
  })

  it("renders megabytes with one decimal", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB")
  })

  it("guards against invalid sizes", () => {
    expect(formatFileSize(-1)).toBe("0 B")
    expect(formatFileSize(Number.NaN)).toBe("0 B")
  })
})

describe("formatSignedAmount", () => {
  it("prefixes income with + and expense with -", () => {
    expect(formatSignedAmount(150, "BOB", "Income")).toBe("+Bs 150.00")
    expect(formatSignedAmount(45.5, "BOB", "Expense")).toBe("-Bs 45.50")
  })

  it("uses a $ prefix for USD and a suffix for other currencies", () => {
    expect(formatSignedAmount(20, "USD", "Income")).toBe("+$ 20.00")
    expect(formatSignedAmount(20, "USDT", "Expense")).toBe("-20.00 USDT")
  })
})
