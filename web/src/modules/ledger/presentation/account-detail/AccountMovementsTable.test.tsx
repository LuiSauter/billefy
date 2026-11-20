import { describe, it, expect } from "vitest";
import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountMovementsTable } from "./AccountMovementsTable";
import { AccountDto, TransactionDto } from "../../domain/ledger.types";

const account: AccountDto = {
  id: "acc-1",
  name: "Banco BCP",
  type: "Savings",
  currency: "BOB",
  balance: new Decimal(1000),
  createdAt: "2026-01-01T00:00:00Z",
};

const transactions: TransactionDto[] = [
  {
    id: "tx-1",
    accountId: "acc-1",
    amount: new Decimal("100.00"),
    currency: "BOB",
    direction: "Income",
    occurredAt: "2026-10-11T10:00:00Z",
    description: "Salario",
    createdAt: "2026-10-11T10:00:00Z",
  },
];

describe("AccountMovementsTable", () => {
  it("uses the shared Input and SelectField controls and keeps every filter option", () => {
    const html = renderToStaticMarkup(
      <AccountMovementsTable account={account} transactions={transactions} />
    );

    expect(html).toContain('data-slot="input"');
    expect(html).toContain("Buscar movimiento...");
    expect(html.match(/data-slot="select-field"/g)).toHaveLength(2);
    for (const label of [
      "Todos los tipos",
      "Ingresos",
      "Gastos",
      "Transferencias",
      "Este mes",
      "Mes anterior",
      "Todos los períodos",
    ]) {
      expect(html).toContain(label);
    }
  });

  it("hides low-priority columns on narrow cards instead of forcing a 640px table", () => {
    const html = renderToStaticMarkup(
      <AccountMovementsTable account={account} transactions={transactions} />
    );

    expect(html).not.toContain("min-w-[640px]");
    expect(html).toContain("hidden @2xl:table-cell"); // Categoría
    expect(html).toContain("hidden @4xl:table-cell"); // Tipo
    // The category stays visible under the description while its column is hidden.
    expect(html).toContain("General");
    expect(html).toContain("Salario");
    expect(html).toContain('aria-label="Acciones del movimiento"');
  });
});
