import { describe, it, expect, vi } from "vitest";
import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountBalanceEvolutionChart } from "./AccountBalanceEvolutionChart";
import { AccountDto } from "../../domain/ledger.types";
import { formatCompactAmount } from "@/shared/lib/chart-utils";
import { DEFAULT_NUMBER_FORMAT_PREFERENCES } from "@/shared/lib/number-format";

type CapturedAxisProps = { tickFormatter?: (value: number) => string };
const capturedYAxes: CapturedAxisProps[] = [];

// Recharts only lays out its children client-side: inspect the element tree instead.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AreaChart: ({ children }: { children: React.ReactNode }) => {
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === actual.YAxis) {
          capturedYAxes.push(child.props as CapturedAxisProps);
        }
      });
      return null;
    },
  };
});

const account: AccountDto = {
  id: "acc-1",
  name: "Banco BCP",
  type: "Savings",
  currency: "BOB",
  balance: new Decimal(1200),
  createdAt: "2026-01-01T00:00:00Z",
};

describe("AccountBalanceEvolutionChart", () => {
  it("uses the shared compact axis formatter and a shared select for the range", () => {
    capturedYAxes.length = 0;
    const html = renderToStaticMarkup(
      <AccountBalanceEvolutionChart account={account} transactions={[]} />
    );

    const tickFormatter = capturedYAxes[0]?.tickFormatter;
    expect(tickFormatter).toBeTypeOf("function");
    expect(tickFormatter!(1200)).toBe(formatCompactAmount(1200, "BOB", DEFAULT_NUMBER_FORMAT_PREFERENCES));
    expect(tickFormatter!(1200)).toBe("1,2K");
    expect(tickFormatter!(0)).toBe("0");

    expect(html).toContain("Evolución del saldo");
    expect(html).toContain('data-slot="select-field"');
    for (const label of ["Últimos 30 días", "Últimos 3 meses", "Últimos 6 meses", "Este año"]) {
      expect(html).toContain(label);
    }
  });
});
