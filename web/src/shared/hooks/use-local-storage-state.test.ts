import { describe, expect, it } from "vitest";
import { readPersistedState, writePersistedState } from "./use-local-storage-state";

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    raw: store,
  };
}

describe("readPersistedState", () => {
  it("returns the fallback when the key is absent", () => {
    const storage = mockStorage();
    expect(readPersistedState("missing", { a: 1 }, storage)).toEqual({ a: 1 });
  });

  it("parses a previously stored value", () => {
    const storage = mockStorage();
    storage.setItem("widths", JSON.stringify({ fecha: 120 }));
    expect(readPersistedState("widths", {}, storage)).toEqual({ fecha: 120 });
  });

  it("returns the fallback when the stored value is corrupted JSON", () => {
    const storage = mockStorage();
    storage.raw.set("widths", "{not json");
    expect(readPersistedState("widths", { fallback: true }, storage)).toEqual({ fallback: true });
  });

  it("returns the fallback when no storage is available (SSR)", () => {
    expect(readPersistedState("widths", { fallback: true })).toEqual({ fallback: true });
  });
});

describe("writePersistedState", () => {
  it("serializes the value under the given key", () => {
    const storage = mockStorage();
    writePersistedState("widths", { fecha: 140 }, storage);
    expect(storage.getItem("widths")).toBe(JSON.stringify({ fecha: 140 }));
  });

  it("does not throw when storage is unavailable", () => {
    expect(() => writePersistedState("widths", { fecha: 1 })).not.toThrow();
  });

  it("does not throw when the storage throws (quota exceeded)", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => writePersistedState("widths", { fecha: 1 }, storage)).not.toThrow();
  });
});
