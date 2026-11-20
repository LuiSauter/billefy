import { describe, it, expect } from "vitest";
import { createMoney, addMoney, subtractMoney, formatMoney } from "./money";

describe("Web Money helper", () => {
  it("should create money without floating point errors", () => {
    const money = createMoney("0.1", "BOB");
    expect(money.currency).toBe("BOB");
    expect(money.amount.toString()).toBe("0.1");
  });

  it("should perform exact decimal addition (0.1 + 0.2 = 0.3)", () => {
    const m1 = createMoney("0.1", "USD");
    const m2 = createMoney("0.2", "USD");
    const result = addMoney(m1, m2);

    expect(result.amount.toString()).toBe("0.3");
    expect(formatMoney(result)).toBe("0,30 USD");
  });

  it("should throw error on currency mismatch", () => {
    const m1 = createMoney("10", "BOB");
    const m2 = createMoney("10", "USD");

    expect(() => addMoney(m1, m2)).toThrow("Cannot add different currencies");
    expect(() => subtractMoney(m1, m2)).toThrow("Cannot subtract different currencies");
  });
});
