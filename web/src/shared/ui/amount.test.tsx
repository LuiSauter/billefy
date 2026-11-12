import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Amount } from "./amount";

describe("Amount", () => {
  it("uses tabular sans styling and shows sign and semantic tone", () => {
    const html = renderToStaticMarkup(<Amount value={-12} currency="USD" sign="always" tone="expense" />);
    expect(html).toContain("tabular-nums");
    expect(html).not.toContain("font-mono");
    expect(html).toContain("-$ 12,00");
    expect(html).toContain("text-destructive");
    expect(html).toContain("data-money");
  });
  it("shows full value in the title for compact values", () => {
    expect(renderToStaticMarkup(<Amount value={1200} compact currency="BOB" />)).toContain("title=");
  });
});
