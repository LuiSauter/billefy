import { describe, it, expect, vi } from "vitest";
import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileAccountsCarousel } from "./MobileAccountsCarousel";
import { AccountDto } from "../domain/ledger.types";

const accounts: AccountDto[] = [
  {
    id: "acc-ex",
    name: "Mi Exchange",
    type: "Exchange",
    currency: "USDT",
    balance: new Decimal(100),
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "acc-cash",
    name: "Caja chica",
    type: "Cash",
    currency: "BOB",
    balance: new Decimal(50),
    createdAt: "2026-01-01T00:00:00Z",
  },
];

describe("MobileAccountsCarousel", () => {
  it("derives tag and dot color from the shared category helpers", () => {
    const html = renderToStaticMarkup(
      <MobileAccountsCarousel accounts={accounts} onOpenCreateAccount={vi.fn()} />
    );

    expect(html).toContain("Mis Cuentas");
    expect(html).toContain("Mi Exchange");
    expect(html).toContain("Cripto");
    expect(html).toContain("background-color:var(--color-chart-3)");
    expect(html).toContain("Efectivo");
    expect(html).toContain("background-color:var(--color-chart-2)");
    expect(html).toContain("Vincular");
  });

  it("renders the empty state with its call to action", () => {
    const html = renderToStaticMarkup(
      <MobileAccountsCarousel accounts={[]} onOpenCreateAccount={vi.fn()} />
    );

    expect(html).toContain("No tenés cuentas registradas todavía.");
    expect(html).toContain("+ Vincular tu primera cuenta");
  });
});
