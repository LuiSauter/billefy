import { describe, it, expect, beforeEach } from "vitest";
import {
  getDatePreferences,
  setDatePreferences,
  formatDateWithPreferences,
} from "./date-preferences";

describe("date-preferences", () => {
  beforeEach(() => {
    setDatePreferences({ dateFormat: "DD/MM/AAAA", weekStartsOn: "lunes" });
  });

  it("defaults to DD/MM/AAAA and lunes", () => {
    const prefs = getDatePreferences();
    expect(prefs.dateFormat).toBe("DD/MM/AAAA");
    expect(prefs.weekStartsOn).toBe("lunes");
  });

  it("updates preferences in memory and formats dates accordingly", () => {
    setDatePreferences({ dateFormat: "AAAA-MM-DD", weekStartsOn: "domingo" });
    const prefs = getDatePreferences();
    expect(prefs.dateFormat).toBe("AAAA-MM-DD");
    expect(prefs.weekStartsOn).toBe("domingo");

    const sample = new Date(2026, 4, 15); // May 15, 2026
    expect(formatDateWithPreferences(sample)).toBe("2026-05-15");
  });

  it("supports DD/MM/AAAA and MM/DD/AAAA", () => {
    const sample = new Date(2026, 4, 15);
    expect(formatDateWithPreferences(sample, { dateFormat: "DD/MM/AAAA", weekStartsOn: "lunes" })).toBe("15/05/2026");
    expect(formatDateWithPreferences(sample, { dateFormat: "MM/DD/AAAA", weekStartsOn: "lunes" })).toBe("05/15/2026");
  });
});
