import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StockPicker } from "./StockPicker";

describe("StockPicker", () => {
  it("renders search input with placeholder", () => {
    const html = renderToStaticMarkup(
      <StockPicker
        selectedTicker="NVDA"
        onSelectStock={vi.fn()}
      />
    );

    expect(html).toContain("Buscar por ticker o nombre");
  });
});
