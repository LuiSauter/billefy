import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";
import { CreateGoalModal } from "./CreateGoalModal";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";

vi.mock("@/shared/ui/responsive-drawer", () => ({ ResponsiveDrawer: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children) }));

describe("create goal form", () => {
  it("starts unlinked, only offers matching-currency accounts, and explains balance tracking without synthetic FX", () => {
    const accounts = [
      { id: "b", name: "Caja BOB", currency: "BOB", balance: new Decimal(10) },
      { id: "u", name: "Cuenta USD", currency: "USD", balance: new Decimal(20) },
    ] as AccountDto[];
    const html = renderToStaticMarkup(<CreateGoalModal isOpen accounts={accounts} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(html).toContain("su saldo completo cuenta para el avance");
    expect(html).toContain("Sin cuenta vinculada");
    expect(html).toContain("Caja BOB");
    expect(html).not.toContain("Cuenta USD");
    expect(html).not.toContain("≈ Bs.");
  });
});
