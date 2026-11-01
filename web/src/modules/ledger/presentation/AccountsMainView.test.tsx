import { describe, it, expect, vi } from "vitest";
import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountsMainView } from "./AccountsMainView";
import { AccountDto } from "../domain/ledger.types";

const mockAccounts: AccountDto[] = [
  {
    id: "acc-1",
    name: "Banco BCP",
    type: "Savings",
    currency: "USD",
    balance: new Decimal(7500),
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-2",
    name: "Mercado Pago",
    type: "Wallet",
    currency: "USD",
    balance: new Decimal(1240),
    createdAt: new Date().toISOString(),
  },
];

describe("AccountsMainView", () => {
  it("renders accounts grid with dashed add card", () => {
    const html = renderToStaticMarkup(
      <AccountsMainView
        accounts={mockAccounts}
        loading={false}
        viewMode="grid"
        onOpenCreateAccountModal={vi.fn()}
        onOpenReconcileModal={vi.fn()}
      />
    );

    expect(html).toContain("Banco BCP");
    expect(html).toContain("Mercado Pago");
    expect(html).toContain("Agregar cuenta");
    expect(html).toContain("Banco, wallet, cripto, inversión, etc.");
  });

  it("renders list mode when viewMode is list", () => {
    const html = renderToStaticMarkup(
      <AccountsMainView
        accounts={mockAccounts}
        loading={false}
        viewMode="list"
        onOpenCreateAccountModal={vi.fn()}
        onOpenReconcileModal={vi.fn()}
      />
    );

    expect(html).toContain("Banco BCP");
    expect(html).toContain("Mercado Pago");
    expect(html).toContain("Agregar otra cuenta");
  });
});
