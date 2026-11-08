import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CreateInvestmentModal } from "./CreateInvestmentModal";

describe("CreateInvestmentModal", () => {
  it("renders crypto selection, quantity, and total value inputs", () => {
    const html = renderToStaticMarkup(
      <CreateInvestmentModal
        isOpen={true}
        onClose={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(html).toContain("Registrar nueva inversión");
    expect(html).toContain("Cantidad de monedas");
    expect(html).toContain("Valor total");
    expect(html).toContain("Bitcoin (BTC)");
  });

  it("does not render when isOpen is false", () => {
    const html = renderToStaticMarkup(
      <CreateInvestmentModal
        isOpen={false}
        onClose={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(html).toBe("");
  });
});
