import React from "react";
import Decimal from "decimal.js";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DraftDto } from "../domain/ingestion.types";
import { DraftsDrawerModal } from "./DraftsDrawerModal";

vi.mock("@/shared/ui/responsive-drawer", () => ({
  ResponsiveDrawer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const draft: DraftDto = {
  id: "draft-bob",
  source: "Bank",
  status: "Review",
  direction: "Expense",
  amount: new Decimal("1250"),
  currency: "BOB",
  estimatedDate: "2026-01-01",
  fingerprint: "fingerprint",
  confidence: 1,
  createdAt: "2026-01-01",
  linkedEventsCount: 0,
};

describe("DraftsDrawerModal number formatting", () => {
  it("shows each draft amount with its actual currency and expense sign", () => {
    const html = renderToStaticMarkup(
      <DraftsDrawerModal
        isOpen
        onClose={() => {}}
        drafts={[draft]}
        accounts={[]}
        onConfirmDraft={() => {}}
        onConfirmAll={() => {}}
      />
    );

    expect(html).toContain("-Bs 1.250,00");
  });
});
