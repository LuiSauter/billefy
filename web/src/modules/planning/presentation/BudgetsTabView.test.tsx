import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BudgetsLoadStatus, resolveBudgetsLoadState } from "./BudgetsTabView";

describe("resolveBudgetsLoadState", () => {
  it("reports initial loading when there is no data yet", () => {
    expect(resolveBudgetsLoadState(0, true, null)).toBe("loading");
  });

  it("reports a blocking error when loading failed without data", () => {
    expect(resolveBudgetsLoadState(0, false, new Error("boom"))).toBe("error");
  });

  it("keeps existing data as stale when a refresh failed", () => {
    expect(resolveBudgetsLoadState(2, false, new Error("boom"))).toBe("stale");
  });

  it("keeps existing data while refreshing", () => {
    expect(resolveBudgetsLoadState(2, true, null)).toBe("refreshing");
  });

  it("is ready for loaded data or a genuinely empty list", () => {
    expect(resolveBudgetsLoadState(2, false, null)).toBe("ready");
    expect(resolveBudgetsLoadState(0, false, null)).toBe("ready");
  });
});

describe("BudgetsLoadStatus", () => {
  it("renders a loading status instead of an empty state", () => {
    const html = renderToStaticMarkup(<BudgetsLoadStatus state="loading" onRetry={vi.fn()} />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Cargando presupuestos");
    expect(html).not.toContain("Reintentar");
  });

  it("renders an actionable error without data", () => {
    const html = renderToStaticMarkup(<BudgetsLoadStatus state="error" onRetry={vi.fn()} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("No se pudieron cargar los presupuestos");
    expect(html).toContain("Reintentar");
  });

  it("warns that existing data may be outdated and offers retry", () => {
    const html = renderToStaticMarkup(<BudgetsLoadStatus state="stale" onRetry={vi.fn()} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("pueden estar desactualizados");
    expect(html).toContain("Reintentar");
  });

  it("shows a small refreshing indicator while keeping data", () => {
    const html = renderToStaticMarkup(<BudgetsLoadStatus state="refreshing" onRetry={vi.fn()} />);
    expect(html).toContain("Actualizando");
    expect(html).not.toContain("Reintentar");
  });

  it("renders nothing when ready", () => {
    expect(renderToStaticMarkup(<BudgetsLoadStatus state="ready" onRetry={vi.fn()} />)).toBe("");
  });
});
