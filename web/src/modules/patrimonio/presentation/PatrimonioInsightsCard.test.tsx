import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatrimonioInsightsCard } from "./PatrimonioInsightsCard";

describe("PatrimonioInsightsCard", () => {
  it("renders an icon and color per insight type instead of always a green check", () => {
    const html = renderToStaticMarkup(
      <PatrimonioInsightsCard
        insights={[
          { id: "a", text: "Crecimiento", type: "positive" },
          { id: "b", text: "Concentración", type: "info" },
          { id: "c", text: "Deuda alta", type: "warning" },
        ]}
      />
    );

    expect(html).toContain('data-insight-type="positive"');
    expect(html).toContain('data-insight-type="info"');
    const warning = html.slice(html.indexOf('data-insight-type="warning"'));
    expect(warning.slice(0, warning.indexOf("Deuda alta"))).toContain("text-amber-400");
    expect(warning.slice(0, warning.indexOf("Deuda alta"))).not.toContain("text-emerald-400");
  });
});
