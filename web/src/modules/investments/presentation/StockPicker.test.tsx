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

  it("uses the shared Input and keeps the list closed until it is focused", () => {
    const html = renderToStaticMarkup(<StockPicker selectedTicker="" onSelectStock={vi.fn()} />);
    expect(html).toContain('data-slot="input"');
    expect(html).not.toContain("Sugeridos:");
  });
});
