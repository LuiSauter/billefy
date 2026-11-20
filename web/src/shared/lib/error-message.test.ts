import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./error-message";

describe("getErrorMessage", () => {
  it("returns the error message when given an Error instance", () => {
    expect(getErrorMessage(new Error("Falló la conexión"), "Fallback")).toBe("Falló la conexión");
  });

  it("returns the string when given a non-empty string", () => {
    expect(getErrorMessage("Texto directo", "Fallback")).toBe("Texto directo");
  });

  it("returns fallback when given null, undefined, or empty error", () => {
    expect(getErrorMessage(null, "Fallback")).toBe("Fallback");
    expect(getErrorMessage(undefined, "Fallback")).toBe("Fallback");
    expect(getErrorMessage(new Error(""), "Fallback")).toBe("Fallback");
  });
});
