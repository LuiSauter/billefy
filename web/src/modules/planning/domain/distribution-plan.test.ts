import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  bucketFromPreset, bucketTrackingMode, changeBucketTrackingMode,
  DistributionPlan, PlanBucket, PLAN_PRESETS, totalPercent, validatePlan,
} from "./distribution-plan";
import { DistributionPlanView } from "../presentation/DistributionPlanView";

vi.mock("@/modules/ledger/application/CategoriesContext", () => ({
  useUserCategories: () => ({ getCategoriesByDirection: () => [
    { id: "food", name: "Comida", iconKey: "utensils", colorKey: "blue" },
  ] }),
}));

const bucket = (changes: Partial<PlanBucket> = {}): PlanBucket => ({
  id: "one", name: "Gastos", percent: 50, colorKey: "blue", categoryIds: [], ...changes,
});
const valid = () => [bucket(), bucket({ id: "two", name: "Objetivo", trackingMode: "TargetOnly" })];
const errors = (buckets: PlanBucket[]) => validatePlan(buckets, ["food"]);

function render(buckets: PlanBucket[], enabled = true) {
  const plan: DistributionPlan = { enabled, buckets };
  return renderToStaticMarkup(React.createElement(DistributionPlanView, {
    controller: { plan, setBuckets: vi.fn(), setEnabled: vi.fn(), validationErrors: errors(buckets) },
    transactions: [], p2pRate: 7,
  }));
}

describe("enabled plan validation", () => {
  it("accepts 2–8 named groups, decimal totals and optional legacy expense mode", () => {
    const buckets = [33.3, 33.3, 33.3, 0.1].map((percent) => bucket({ percent }));
    expect(totalPercent(buckets)).toBe(100);
    expect(errors(buckets)).toEqual([]);
    expect(errors(Array.from({ length: 8 }, () => bucket({ percent: 12.5 })))).toEqual([]);
    expect(bucketTrackingMode(bucket({ name: "Ahorro" }))).toBe("Expenses");
  });

  it.each([[], [bucket({ percent: 100 })], Array.from({ length: 9 }, () => bucket({ percent: 100 / 9 }))])(
    "rejects group counts outside 2–8 (%#)", (...items) => {
      // Use the table row as the bucket list, including its empty case.
      expect(errors(items as PlanBucket[]).join(" ")).toContain("2 y 8");
    },
  );

  it.each([0, -1, 101, NaN, Infinity])("rejects invalid percent %s", (percent) => {
    expect(errors([bucket({ percent }), valid()[1]]).join(" ")).toContain("positivos");
  });

  it("requires exactly 100 without rounding near totals", () => {
    expect(errors([bucket({ percent: 49.999999 }), valid()[1]]).join(" ")).toContain("100%");
    expect(errors([bucket({ percent: 99.9 }), bucket({ percent: 0.100000000000001 })]).join(" ")).toContain("100%");
  });

  it.each(["", "  ", "a".repeat(61)])("rejects invalid name %s", (name) => {
    expect(errors([bucket({ name }), valid()[1]]).join(" ")).toContain("nombre");
  });

  it("rejects unknown, income/foreign and duplicate category references", () => {
    for (const ids of [["missing"], ["income"], ["foreign"], ["food", "FOOD"]]) {
      expect(errors([bucket({ categoryIds: ids }), valid()[1]]).length).toBeGreaterThan(0);
    }
    expect(errors([bucket({ categoryIds: ["food"] }), bucket({ categoryIds: ["FOOD"] })]).join(" ")).toContain("una vez");
    expect(errors([bucket({ categoryIds: ["FOOD"] }), valid()[1]])).toEqual([]);
  });

  it("rejects target categories and any non-exact explicit mode", () => {
    expect(errors([valid()[0], bucket({ trackingMode: "TargetOnly", categoryIds: ["food"] })]).join(" ")).toContain("categorías");
    for (const trackingMode of [null, "targetonly", "Other"]) {
      expect(errors([bucket({ trackingMode } as unknown as PlanBucket), valid()[1]]).length).toBeGreaterThan(0);
    }
  });

  it("presets explicitly mark targets; only an explicit mode change clears categories", () => {
    for (const preset of PLAN_PRESETS) {
      const buckets = bucketFromPreset(preset);
      expect(errors(buckets)).toEqual([]);
      expect(buckets.filter((b) => b.trackingMode === "TargetOnly").length).toBeGreaterThan(0);
      expect(buckets.every((b) => b.trackingMode !== undefined)).toBe(true);
    }
    const legacy = bucket({ name: "Inversión", categoryIds: ["food"] });
    expect(bucketTrackingMode(legacy)).toBe("Expenses");
    expect(changeBucketTrackingMode(legacy, "TargetOnly").categoryIds).toEqual([]);
    expect(legacy.categoryIds).toEqual(["food"]);
    expect(changeBucketTrackingMode(legacy, "Expenses").categoryIds).toEqual(["food"]);
  });
});

describe("plan UI contract (static rendering, not browser interaction)", () => {
  it("renders target allocation without spending or progress implications", () => {
    const html = render([bucket({ trackingMode: "TargetOnly", percent: 100 })]);
    expect(html).toContain("Objetivo asignado");
    expect(html).toContain("No registra aportes");
    expect(html).not.toContain("de Bs");
    expect(html).not.toContain("overflow-hidden");
    expect(html).not.toMatch(/restante|completado/i);
  });

  it("retains legacy expense progress regardless of the group name", () => {
    const html = render([bucket({ name: "Ahorro", percent: 100 })]);
    expect(html).toMatch(/de\s*(?:<[^>]+>)*\s*Bs/);
    expect(html).toContain("overflow-hidden");
    expect(html).not.toContain("No registra aportes");
  });

  it("shows explicit selectors, removal warning and categories only for expense groups", () => {
    const html = render([bucket({ categoryIds: ["food"] }), valid()[1]], false);
    expect(html.match(/Comida/g)).toHaveLength(1);
    expect(html.match(/<select/g)).toHaveLength(2);
    expect(html).toContain("Solo objetivo (ahorro/inversión)");
    expect(html).toContain("se quitan las categorías asignadas");
    expect(html).toContain("Activar plan");
    expect(html).toContain("sin transferencias");
    expect(html).toContain("presupuestos");
  });

  it("keeps empty disabled drafts editable with actionable activation feedback", () => {
    const html = render([], false);
    expect(html).toContain("Configurá entre 2 y 8 grupos");
    expect(html).toContain("Empezá con una plantilla");
    expect(html).toMatch(/disabled=""[^>]*>Activar plan/);
  });

  it("keeps activation/configuration reachable and guards enabled saves", () => {
    const hook = readFileSync(new URL("../application/useDistributionPlan.ts", import.meta.url), "utf8");
    const page = readFileSync(new URL("../../../app/page.tsx", import.meta.url), "utf8");
    expect(hook).toMatch(/if \(latest\.current\.enabled && validatePlan/);
    expect(hook).toMatch(/if \(enabled && validatePlan/);
    expect(page).toContain('activeTab === "plan" && (');
    expect(page).toContain('setActiveTab("plan")');
  });
});
