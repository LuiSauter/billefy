import { describe, it, expect, vi } from "vitest";
import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { DeleteAccountConfirmation } from "./DeleteAccountConfirmation";
import { AccountDto } from "../domain/ledger.types";

const account: AccountDto = {
  id: "acc-1",
  name: "Banco BCP",
  type: "Savings",
  currency: "BOB",
  balance: new Decimal(10),
  createdAt: "2026-01-01T00:00:00Z",
};

describe("DeleteAccountConfirmation", () => {
  it("inline presentation keeps the edit-modal copy and buttons", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountConfirmation
        account={account}
        presentation="inline"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain("¿Confirmás eliminar la cuenta «Banco BCP»?");
    expect(html).toContain("Si tiene transacciones registradas, será archivada");
    expect(html).toContain("Cancelar");
    expect(html).toContain("Sí, eliminar cuenta");
  });

  it("renders nothing inline while no account is pending", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountConfirmation
        account={null}
        presentation="inline"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe("");
  });
});
