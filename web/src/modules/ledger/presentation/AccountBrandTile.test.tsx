import { describe, it, expect } from "vitest";
import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountBrandTile } from "./AccountBrandTile";
import { AccountsCard } from "./AccountsCard";
import { AccountStatusBadge } from "./AccountStatusBadge";
import { AccountDto } from "../domain/ledger.types";

const make = (name: string, type: AccountDto["type"] = "Savings"): AccountDto => ({
  id: "acc",
  name,
  type,
  currency: "BOB",
  balance: new Decimal(1),
  createdAt: "2026-01-01T00:00:00Z",
});

describe("AccountBrandTile", () => {
  it("renders the same brand tile at both sizes", () => {
    const md = renderToStaticMarkup(<AccountBrandTile account={make("Banco BCP")} size="md" />);
    const lg = renderToStaticMarkup(<AccountBrandTile account={make("Banco BCP")} size="lg" />);

    expect(md).toContain("bg-[#002a8f]");
    expect(md).toContain("w-10 h-10 rounded-xl");
    expect(lg).toContain("bg-[#002a8f]");
    expect(lg).toContain("w-12 h-12 rounded-2xl");
  });

  it("uses the shared IconTile for cash and brokers and covers payoneer/bisa in both call sites", () => {
    const cash = renderToStaticMarkup(<AccountBrandTile account={make("Caja", "Cash")} size="lg" />);
    const payoneer = renderToStaticMarkup(<AccountBrandTile account={make("Payoneer")} size="lg" />);
    const bisa = renderToStaticMarkup(<AccountBrandTile account={make("Banco Bisa")} size="md" />);

    expect(cash).toContain("bg-emerald-500/15");
    expect(cash).toContain("w-12 h-12");
    expect(payoneer).toContain("from-[#ff4800]");
    expect(bisa).toContain("bg-[#ffd100]");
  });

  it("falls back to the category icon badge for unbranded accounts", () => {
    const html = renderToStaticMarkup(<AccountBrandTile account={make("Cuenta X")} size="md" />);
    expect(html).toContain("w-9 h-9");
  });
});

describe("AccountsCard / AccountStatusBadge", () => {
  it("AccountsCard carries the shared card recipe", () => {
    const html = renderToStaticMarkup(<AccountsCard className="extra">x</AccountsCard>);
    expect(html).toContain('data-slot="card"');
    expect(html).toContain("bg-card/60");
    expect(html).toContain("border-border/70");
    expect(html).toContain("extra");
  });

  it("AccountStatusBadge renders the single Activa pill", () => {
    const html = renderToStaticMarkup(<AccountStatusBadge />);
    expect(html).toContain("Activa");
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain("border-emerald-500/30");
  });
});
