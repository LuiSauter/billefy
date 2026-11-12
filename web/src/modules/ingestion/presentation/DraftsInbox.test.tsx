import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Decimal from "decimal.js";
import { DraftDto } from "../domain/ingestion.types";
import { DraftsInbox } from "./DraftsInbox";

const draft: DraftDto = {
  id: "draft-usd", source: "Bank", status: "Review", direction: "Expense",
  amount: new Decimal("1250"), currency: "USD", estimatedDate: "2026-01-01",
  fingerprint: "fingerprint", confidence: 1, createdAt: "2026-01-01", linkedEventsCount: 0,
};

describe("DraftsInbox", () => {
  it("formats each draft amount in its actual currency", () => {
    const html = renderToStaticMarkup(<DraftsInbox drafts={[draft]} accounts={[]} onConfirmDraft={() => {}} />);
    expect(html).toContain("-$ 1.250,00");
    expect(html).not.toContain("Bs");
  });
});
