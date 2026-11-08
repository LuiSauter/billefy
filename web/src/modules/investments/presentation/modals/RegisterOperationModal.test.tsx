import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RegisterOperationModal } from "./RegisterOperationModal";
import { Investment } from "../../domain/investment.types";

const mockInvestment: Investment = {
  id: "inv-btc",
  name: "Bitcoin (BTC)",
  kind: "crypto",
  iconKey: "coins",
  colorKey: "amber",
  currency: "USDT",
  quantity: 0.5,
  initialValue: 30000,
  currentValue: 35000,
  history: [],
  createdAt: "2026-01-01",
};

describe("RegisterOperationModal", () => {
  it("renders operation inputs for Cantidad, Precio unitario, and Monto total", () => {
    const html = renderToStaticMarkup(
      <RegisterOperationModal
        investment={mockInvestment}
        accounts={[]}
        isOpen={true}
        onClose={vi.fn()}
        onConfirmOperation={vi.fn()}
      />
    );

    expect(html).toContain("Registrar operación");
    expect(html).toContain("Bitcoin (BTC)");
    expect(html).toContain("Cantidad (USDT)");
    expect(html).toContain("Precio unitario ($)");
    expect(html).toContain("Monto total ($)");
    expect(html).toContain("Compra");
    expect(html).toContain("Venta");
  });

  it("does not render when isOpen is false or investment is null", () => {
    const htmlClosed = renderToStaticMarkup(
      <RegisterOperationModal
        investment={mockInvestment}
        accounts={[]}
        isOpen={false}
        onClose={vi.fn()}
        onConfirmOperation={vi.fn()}
      />
    );
    expect(htmlClosed).toBe("");

    const htmlNull = renderToStaticMarkup(
      <RegisterOperationModal
        investment={null}
        accounts={[]}
        isOpen={true}
        onClose={vi.fn()}
        onConfirmOperation={vi.fn()}
      />
    );
    expect(htmlNull).toBe("");
  });
});
