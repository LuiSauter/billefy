import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/shared/ui/responsive-drawer", () => ({
  ResponsiveDrawer: ({
    open,
    title,
    description,
    children,
    footer,
  }: {
    open: boolean;
    title: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) =>
    open ? (
      <div data-slot="responsive-drawer">
        <div>{title}</div>
        {description && <div>{description}</div>}
        {children}
        {footer}
      </div>
    ) : null,
}));

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

    expect(html).toContain("Comprar BTC");
    expect(html).toContain("Bitcoin (BTC)");
    expect(html).toContain("Binance Spot");
    expect(html).toContain("Monto que vas a pagar");
    expect(html).toContain("Cantidad de BTC");
    expect(html).toContain("Conversión bidireccional automática");
    expect(html).toContain("Comprar");
    expect(html).toContain("Vender");
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
