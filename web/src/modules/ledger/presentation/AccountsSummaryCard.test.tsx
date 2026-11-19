import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChangeBadge } from "./AccountsSummaryCard";

describe("ChangeBadge", () => {
  it("uses an ASCII minus for negative deltas and a plus for positive ones", () => {
    const negative = renderToStaticMarkup(<ChangeBadge pct={-3} />);
    const positive = renderToStaticMarkup(<ChangeBadge pct={4.5} />);

    expect(negative).toContain("-3,00%");
    expect(negative).not.toContain("−");
    expect(positive).toContain("+4,50%");
  });

  it("renders the no-base state when there is no percentage", () => {
    expect(renderToStaticMarkup(<ChangeBadge pct={null} />)).toContain("Sin base");
  });
});
