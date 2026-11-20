import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardCard, dashboardCardClassName } from "./dashboard-card";

describe("DashboardCard", () => {
  it("exports the shared dashboard card variant", () => {
    expect(dashboardCardClassName).toBe(
      "rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs"
    );
  });

  it("renders a Card carrying the variant plus caller classes and props", () => {
    const html = renderToStaticMarkup(
      <DashboardCard className="h-full" data-testid="x">
        child
      </DashboardCard>
    );

    expect(html).toContain('data-slot="card"');
    expect(html).toContain("bg-card/60");
    expect(html).toContain("backdrop-blur-xs");
    expect(html).toContain("border-border/70");
    expect(html).toContain("h-full");
    expect(html).toContain('data-testid="x"');
    expect(html).toContain("child");
  });
});
