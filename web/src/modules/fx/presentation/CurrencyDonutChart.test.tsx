import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CurrencyDonutChart } from "./CurrencyDonutChart";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";

describe("CurrencyDonutChart number formatting", () => {
  it("formats displayed category balances with Spanish separators", () => {
    const accounts: AccountDto[] = [{
      id: "acc", name: "Cuenta USD", type: "Savings", currency: "USD",
      balance: new Decimal("1234.56"), createdAt: "2026-01-01T00:00:00Z",
    }];
    const html = renderToStaticMarkup(<CurrencyDonutChart accounts={accounts} p2pRate={10} />);
    expect(html).toContain("1.234,56 USD");
  });
});
