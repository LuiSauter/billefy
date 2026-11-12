import { describe, it, expect } from "vitest";
import { validatePassword } from "./password-policy";

describe("Password Policy Validation", () => {
  it("rejects empty or short passwords", () => {
    const res = validatePassword("Short1!");
    expect(res.criteria.minLength).toBe(false);
    expect(res.isValid).toBe(false);
  });

  it("checks for uppercase letters", () => {
    const res = validatePassword("lowercase123!");
    expect(res.criteria.hasUppercase).toBe(false);
    expect(res.isValid).toBe(false);
  });

  it("checks for numbers", () => {
    const res = validatePassword("NoNumbersHere!");
    expect(res.criteria.hasNumber).toBe(false);
    expect(res.isValid).toBe(false);
  });

  it("checks for symbols", () => {
    const res = validatePassword("NoSymbols1234");
    expect(res.criteria.hasSymbol).toBe(false);
    expect(res.isValid).toBe(false);
  });

  it("accepts a fully compliant secure password", () => {
    const res = validatePassword("Test@123");
    expect(res.criteria.minLength).toBe(true);
    expect(res.criteria.hasUppercase).toBe(true);
    expect(res.criteria.hasNumber).toBe(true);
    expect(res.criteria.hasSymbol).toBe(true);
    expect(res.isValid).toBe(true);
    expect(res.strength).toBe("strong");
    expect(res.score).toBe(4);
  });
});
