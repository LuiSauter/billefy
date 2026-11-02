import { describe, it, expect, vi } from "vitest";
import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountDetailView } from "./AccountDetailView";
import { AccountDto, TransactionDto } from "../../domain/ledger.types";

const mockAccount: AccountDto = {
  id: "acc-bcp-1",
  name: "Banco BCP",
  type: "Savings",
  currency: "BOB",
  balance: new Decimal("24580.00"),
  createdAt: "2026-01-01T00:00:00Z",
};

const mockTransactions: TransactionDto[] = [
  {
    id: "tx-1",
    accountId: "acc-bcp-1",
    amount: new Decimal("12000.00"),
    currency: "BOB",
    direction: "Income",
    occurredAt: "2026-10-11T10:00:00Z",
    description: "Salario",
    createdAt: "2026-10-11T10:00:00Z",
  },
  {
    id: "tx-2",
    accountId: "acc-bcp-1",
    amount: new Decimal("350.00"),
    currency: "BOB",
    direction: "Expense",
    occurredAt: "2026-10-09T14:00:00Z",
    description: "Supermercado Fidalga",
    createdAt: "2026-10-09T14:00:00Z",
  },
];

describe("AccountDetailView", () => {
  it("renders header, hero card, tabs, charts and movements table", () => {
    const html = renderToStaticMarkup(
      <AccountDetailView
        account={mockAccount}
        transactions={mockTransactions}
        onBack={vi.fn()}
        onOpenReconcileModal={vi.fn()}
        onOpenEditAccountModal={vi.fn()}
        onOpenRegisterTxnModal={vi.fn()}
      />
    );

    // Header & Title
    expect(html).toContain("Detalle de cuenta");
    expect(html).toContain("Consulta el saldo, movimientos y estadísticas de tu cuenta.");

    // Hero card
    expect(html).toContain("Banco BCP");
    expect(html).toContain("Saldo actual");
    expect(html).toContain("Saldo inicial");
    expect(html).toContain("Variación del período");
    expect(html).toContain("Activa");

    // Action buttons
    expect(html).toContain("Conciliar saldo");
    expect(html).toContain("Editar cuenta");
    expect(html).toContain("Registrar movimiento");
    expect(html).toContain("Volver a mis cuentas");

    // Navigation Tabs
    expect(html).toContain("Resumen");
    expect(html).toContain("Movimientos");
    expect(html).toContain("Conciliación");
    expect(html).toContain("Configuración");

    // Charts & sections
    expect(html).toContain("Evolución del saldo");
    expect(html).toContain("Entradas vs. Salidas");
    expect(html).toContain("Últimos movimientos");
    expect(html).toContain("Información de la cuenta");
    expect(html).toContain("Estadísticas del período");

    // Table rows
    expect(html).toContain("Salario");
    expect(html).toContain("Supermercado Fidalga");
  });

  it("handles empty transactions gracefully without crashing", () => {
    const emptyAccount: AccountDto = {
      id: "acc-empty",
      name: "Billetera Nueva",
      type: "Cash",
      currency: "USD",
      balance: new Decimal(0),
      createdAt: "2026-02-01T00:00:00Z",
    };

    const html = renderToStaticMarkup(
      <AccountDetailView
        account={emptyAccount}
        transactions={[]}
        onBack={vi.fn()}
        onOpenReconcileModal={vi.fn()}
        onOpenEditAccountModal={vi.fn()}
      />
    );

    expect(html).toContain("Billetera Nueva");
    expect(html).toContain("No se encontraron movimientos registrados");
    expect(html).toContain("Total");
  });
});
