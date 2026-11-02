import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DistributionPlanView } from "./DistributionPlanView";
import { DistributionPlanController } from "../application/useDistributionPlan";
import { TransactionDto } from "@/modules/ledger/domain/ledger.types";

vi.mock("@/modules/ledger/application/CategoriesContext", () => ({
  useUserCategories: () => ({ getCategoriesByDirection: () => [] }),
}));

describe("DistributionPlanView number formatting", () => {
  it("formats Decimal income and plan amounts using Spanish separators", () => {
    const controller = {
      plan: { enabled: true, buckets: [{ id: "target", name: "Ahorro", percent: 100, colorKey: "blue", trackingMode: "TargetOnly", categoryIds: [] }] },
      setBuckets: vi.fn(), setEnabled: vi.fn(), validationErrors: [], loadStatus: "loaded", reloadPlan: vi.fn(),
    } as unknown as DistributionPlanController;
    const transaction: TransactionDto = {
      id: "txn", accountId: "acc", amount: new Decimal("1234.56"), currency: "BOB",
      direction: "Income", occurredAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    };
    const html = renderToStaticMarkup(
      <DistributionPlanView controller={controller} transactions={[transaction]} p2pRate={9.85} />
    );
    expect(html).toContain("1.234,56");
  });
});
