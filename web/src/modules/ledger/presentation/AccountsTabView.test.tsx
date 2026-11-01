import { describe, it, expect, vi } from "vitest";
import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountsTabView } from "./AccountsTabView";
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
  {
    id: "acc-3",
    name: "Binance",
    type: "CryptoWallet",
    currency: "USDT",
    balance: new Decimal(4320),
    createdAt: new Date().toISOString(),
  },
];

describe("AccountsTabView", () => {
  it("renders full accounts tab with stats, toolbar, mis cuentas and analytics", () => {
    const html = renderToStaticMarkup(
      <AccountsTabView
        accounts={mockAccounts}
        transactions={[]}
        p2pRate={9.85}
        selectedCurrency="USD"
        loading={false}
        onOpenCreateAccountModal={vi.fn()}
        onOpenCsvModal={vi.fn()}
        onOpenReconcileModal={vi.fn()}
      />
    );

    // Header & stats
    expect(html).toContain("Cuentas");
    expect(html).toContain("Saldo total en cuentas");
    expect(html).toContain("Agregar cuenta");

    // Filter Toolbar
    expect(html).toContain("Todas las cuentas");
    expect(html).toContain("Bancos");
    expect(html).toContain("Wallets");
    expect(html).toContain("Cripto");

    // Main Cards
    expect(html).toContain("Mis cuentas");
    expect(html).toContain("Banco BCP");
    expect(html).toContain("Mercado Pago");
    expect(html).toContain("Binance");

    // Analytics
    expect(html).toContain("Distribución del saldo");
    expect(html).toContain("Evolución del saldo en cuentas");
  });
});
